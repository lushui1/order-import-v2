import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type OrderRow = Awaited<ReturnType<typeof prisma.order.findMany>>[number];

// ── 简单 API Key 鉴权 ──
const API_KEY = process.env.V2_API_KEY || 'dev-key';

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get('x-api-key');
  return key === API_KEY;
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function dbUnavailable() {
  return NextResponse.json({
    error: 'V2 数据库暂未连接，请配置 DATABASE_URL',
    hint: '请等待 GitHub 推送自动部署或联系管理员配置数据库'
  }, { status: 503 });
}

/**
 * GET /api/v2/orders?page=1&pageSize=50
 * 按条件查询运单列表（分页）
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')));

    const where: any = {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders: orders.map((o: OrderRow) => ({
        id: o.id,
        externalCode: o.externalCode,
        receiverStore: o.receiverStore,
        receiverName: o.receiverName,
        receiverPhone: o.receiverPhone,
        receiverAddress: o.receiverAddress,
        totalAmount: 0,
        skuCode: o.skuCode,
        skuName: o.skuName,
        skuQuantity: o.skuQuantity,
        skuSpec: o.skuSpec,
        remark: o.remark,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    // 任何错误都返回结构化信息，不做 500 crash
    return NextResponse.json({
      error: error.message || '未知错误',
      hint: 'V2 数据库暂未连接或查询失败，请配置 DATABASE_URL',
      shouldDegrade: true,
    }, { status: 503 });
  }
}

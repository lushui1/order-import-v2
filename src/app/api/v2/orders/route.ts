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

/**
 * GET /api/v2/orders?page=1&pageSize=50&status=active
 * 按条件查询运单列表（分页）
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')));

    // Order 表没有 status 字段，忽略 status 筛选
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
        totalAmount: 0,       // Order 表无金额字段，V3 侧兼容
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

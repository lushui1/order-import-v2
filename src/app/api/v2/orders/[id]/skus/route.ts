import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const API_KEY = process.env.V2_API_KEY || 'dev-key';

function checkAuth(req: NextRequest): boolean {
  return req.headers.get('x-api-key') === API_KEY;
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * GET /api/v2/orders/:id/skus?skuCode=xxx
 * 校验 SKU 是否属于该运单
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return unauthorized();

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const skuCode = searchParams.get('skuCode');

    if (!skuCode) {
      return NextResponse.json({ error: '缺少 skuCode 参数' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return NextResponse.json({ error: '运单不存在' }, { status: 404 });
    }

    const exists = order.skuCode === skuCode;

    return NextResponse.json({
      exists,
      skuInfo: exists ? {
        skuCode: order.skuCode,
        skuName: order.skuName,
        quantity: order.skuQuantity,
        spec: order.skuSpec,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

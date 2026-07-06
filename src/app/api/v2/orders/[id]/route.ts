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
 * GET /api/v2/orders/:id
 * 校验运单是否存在 + 获取详情
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return unauthorized();

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return NextResponse.json({ error: '运单不存在' }, { status: 404 });
    }

    return NextResponse.json({
      id: order.id,
      externalCode: order.externalCode,
      receiverStore: order.receiverStore,
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverAddress: order.receiverAddress,
      totalAmount: 0,
      skuCode: order.skuCode,
      skuName: order.skuName,
      skuQuantity: order.skuQuantity,
      skuSpec: order.skuSpec,
      remark: order.remark,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

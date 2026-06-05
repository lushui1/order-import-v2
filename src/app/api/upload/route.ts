import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ruleId = formData.get('ruleId') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 });
    }
    
    // 读取文件
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 创建导入记录
    const importRecord = await prisma.import.create({
      data: {
        fileName: file.name,
        ruleId: ruleId || null,
        status: 'pending',
      },
    });
    
    // 保存文件到临时目录
    const uploadDir = path.join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, `${importRecord.id}_${file.name}`);
    await writeFile(filePath, buffer);
    
    return NextResponse.json({
      importId: importRecord.id,
      fileName: file.name,
      fileSize: buffer.length,
      filePath: `/uploads/${importRecord.id}_${file.name}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

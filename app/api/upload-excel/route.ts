import { NextRequest, NextResponse } from "next/server"
import { EnhancedExcelAgent } from "@/lib/enhanced-excel-agent"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file." },
        { status: 400 }
      )
    }

    // Validate file size (100MB limit as per assignment)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 100MB." },
        { status: 400 }
      )
    }

    const agent = new EnhancedExcelAgent()
    const result = await agent.uploadExcelFile(file)

    return NextResponse.json({
      message: "File uploaded successfully",
      fileId: result.fileId,
      worksheets: result.worksheets,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "File upload failed" },
      { status: 500 }
    )
  }
}

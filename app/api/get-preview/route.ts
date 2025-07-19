import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const worksheetId = formData.get("worksheetId") as string

    if (!worksheetId) {
      return NextResponse.json(
        { error: "Missing worksheet ID" },
        { status: 400 }
      )
    }

    // Get worksheet data from database
    const { data: worksheet, error } = await supabase
      .from('worksheets')
      .select('*')
      .eq('id', worksheetId)
      .single()

    if (error || !worksheet) {
      return NextResponse.json(
        { error: "Worksheet not found" },
        { status: 404 }
      )
    }

    const headers = worksheet.headers
    const rows = worksheet.data
    const previewRows = Math.min(10, rows.length)

    const preview = {
      headers: headers,
      preview: rows.slice(0, previewRows),
      totalRows: rows.length,
      previewRows: previewRows
    }

    return NextResponse.json(preview)
  } catch (error) {
    console.error("Preview error:", error)
    return NextResponse.json(
      { error: "Failed to get preview" },
      { status: 500 }
    )
  }
} 
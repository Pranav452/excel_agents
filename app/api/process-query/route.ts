import { NextRequest, NextResponse } from "next/server"
import { EnhancedExcelAgent } from "@/lib/enhanced-excel-agent"
import { SQLGenerator } from "@/lib/sql-generator"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const fileId = formData.get("fileId") as string
    const worksheetId = formData.get("worksheetId") as string
    const query = formData.get("query") as string

    if (!fileId || !worksheetId || !query) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    // Validate query length
    if (query.length > 1000) {
      return NextResponse.json(
        { error: "Query too long. Maximum length is 1000 characters." },
        { status: 400 }
      )
    }

    const agent = new EnhancedExcelAgent()
    const sqlGenerator = new SQLGenerator()

    // Process the query using the enhanced agent
    const result = await agent.processQuery(fileId, worksheetId, query)

    // Generate SQL for the query (for demonstration)
    const { supabase } = await import('@/lib/supabase')
    const { data: worksheet } = await supabase
      .from('worksheets')
      .select('headers')
      .eq('id', worksheetId)
      .single()

    let sqlResult = null
    if (worksheet) {
      sqlResult = await sqlGenerator.generateSQL(query, worksheet.headers)
    }

    return NextResponse.json({
      result,
      sqlGenerated: sqlResult?.sql || null,
      explanation: sqlResult?.explanation || null,
    })
  } catch (error) {
    console.error("Query processing error:", error)
    return NextResponse.json(
      { error: "Query processing failed" },
      { status: 500 }
    )
  }
}

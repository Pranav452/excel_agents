import * as XLSX from "xlsx"
import { generateText, tool } from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"
import { ColumnMapper } from "./column-mapper"
import { ExcelTools } from "./excel-tools"
import { supabase } from "./supabase"

export class EnhancedExcelAgent {
  private columnMapper: ColumnMapper
  private excelTools: ExcelTools

  constructor() {
    this.columnMapper = new ColumnMapper()
    this.excelTools = new ExcelTools()
  }

  async uploadExcelFile(file: File): Promise<{ fileId: string; worksheets: { id: string; name: string }[] }> {
    try {
      // Read Excel file
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      
      // Store file metadata
      const { data: fileData, error: fileError } = await supabase
        .from('excel_files')
        .insert({
          name: file.name,
          size: file.size,
        })
        .select()
        .single()

      if (fileError) throw fileError

      const fileId = fileData.id
      const worksheets: { id: string; name: string }[] = []

      // Process each worksheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (data.length > 0) {
          const headers = data[0] as string[]
          const rows = data.slice(1)
          
          // Store worksheet data
          const { data: wsData, error: wsError } = await supabase
            .from('worksheets')
            .insert({
              file_id: fileId,
              name: sheetName,
              data: rows,
              headers: headers,
              row_count: rows.length,
            })
            .select('id, name')
            .single()

          if (wsError) throw wsError
          if (wsData) {
            worksheets.push({ id: wsData.id, name: wsData.name })
          }
        }
      }

      return { fileId, worksheets }
    } catch (error) {
      throw new Error(`File upload failed: ${error}`)
    }
  }

  async processQuery(fileId: string, worksheetId: string, query: string): Promise<string> {
    try {
      // Get worksheet data from database
      const { data: worksheet, error } = await supabase
        .from('worksheets')
        .select('*')
        .eq('id', worksheetId)
        .single()

      if (error || !worksheet) {
        throw new Error('Worksheet not found')
      }

      const headers = worksheet.headers
      const rows = worksheet.data

      // Map column names
      const mappedHeaders = this.columnMapper.mapColumns(headers)

      // Try with tools first, fallback to simple response if tools fail
      try {
        const { text } = await generateText({
          model: groq("llama-3.1-8b-instant"),
          prompt: `
            You are an Excel data analyst. Analyze the following data and answer the user's query.
            
            Worksheet: ${worksheet.name}
            Headers: ${mappedHeaders.join(", ")}
            Total rows: ${rows.length}
            
            User Query: ${query}
            
            Instructions:
            1. First, use read_worksheet to understand the data structure
            2. Then use appropriate tools (filter_data, aggregate_data, sort_data, pivot_table) to answer the query
            3. Provide a clear, comprehensive answer based on the tool results
            4. If the query asks for specific data, show the relevant results in a structured format
            5. If the query asks for analysis, provide insights and summaries
            6. Always return the tool results as JSON so they can be displayed in tables
            
            Available tools:
            - read_worksheet: Preview data structure and sample rows
            - filter_data: Filter data by column conditions
            - aggregate_data: Calculate sums, averages, counts, etc.
            - sort_data: Sort data by columns
            - pivot_table: Create summary tables
            - data_validation: Check data quality
            
            Format your response to include both the analysis and the structured data results.
          `,
          tools: {
          read_worksheet: tool({
            description: "Read and preview worksheet data. Use this to see the structure and sample data from the worksheet.",
            parameters: z.object({
              limit: z.number().optional().describe("Number of rows to preview (default: 10)"),
            }).passthrough(),
            execute: async (params) => {
              const limit = params.limit || 10
              const result = this.excelTools.readWorksheet(headers, rows, limit)
              return JSON.stringify(result)
            },
          }),
          filter_data: tool({
            description: "Filter data based on conditions. Use this to find rows that match specific criteria.",
            parameters: z.object({
              column: z.string().describe("Column name to filter"),
              operator: z.enum([">", "<", ">=", "<=", "=", "!=", "contains"]),
              value: z.union([z.string(), z.number()]).describe("Value to filter by"),
            }).passthrough(),
            execute: async (params) => {
              const { column, operator, value } = params
              const result = this.excelTools.filterData(headers, rows, column, operator, value)
              return JSON.stringify(result)
            },
          }),
          aggregate_data: tool({
            description: "Perform aggregations on data",
            parameters: z.object({
              column: z.string().describe("Column to aggregate"),
              operation: z.enum(["sum", "avg", "count", "min", "max"]),
              groupBy: z.string().optional().describe("Column to group by"),
            }),
            execute: async ({ column, operation, groupBy }) => {
              const result = this.excelTools.aggregateData(headers, rows, column, operation, groupBy)
              return JSON.stringify(result)
            },
          }),
          sort_data: tool({
            description: "Sort data by column",
            parameters: z.object({
              column: z.string().describe("Column to sort by"),
              order: z.enum(["asc", "desc"]).default("asc"),
            }),
            execute: async ({ column, order }) => {
              const result = this.excelTools.sortData(headers, rows, column, order)
              return JSON.stringify(result)
            },
          }),
          pivot_table: tool({
            description: "Create pivot table summary",
            parameters: z.object({
              rowField: z.string().describe("Field for rows"),
              valueField: z.string().describe("Field for values"),
              operation: z.enum(["sum", "count", "avg"]).default("sum"),
            }),
            execute: async ({ rowField, valueField, operation }) => {
              const result = this.excelTools.createPivotTable(headers, rows, rowField, valueField, operation)
              return JSON.stringify(result)
            },
          }),
          merge_worksheets: tool({
            description: "Merge multiple worksheets from the same file",
            parameters: z.object({
              worksheetIds: z.array(z.string()).describe("Array of worksheet IDs to merge"),
              mergeType: z.enum(["union", "intersection"]).default("union"),
            }),
            execute: async ({ worksheetIds, mergeType }) => {
              const result = await this.mergeWorksheets(worksheetIds, mergeType)
              return JSON.stringify(result)
            },
          }),
          data_validation: tool({
            description: "Validate data quality and identify issues",
            parameters: z.object({
              column: z.string().optional().describe("Specific column to validate"),
            }),
            execute: async ({ column }) => {
              const result = this.validateData(headers, rows, column)
              return JSON.stringify(result)
            },
          }),
          write_results: tool({
            description: "Save query results to database",
            parameters: z.object({
              result: z.any().describe("Query result to save"),
              sqlGenerated: z.string().describe("SQL query that was generated"),
            }),
            execute: async ({ result, sqlGenerated }) => {
              const savedResult = await this.saveQueryResult(fileId, worksheetId, query, result, sqlGenerated)
              return JSON.stringify(savedResult)
            },
          }),
        },
      })

      return text
      } catch (toolError) {
        console.error("Tool-based processing failed, trying fallback:", toolError)
        
        // Fallback to simple text generation without tools
        const { text } = await generateText({
          model: groq("llama-3.1-8b-instant"),
          prompt: `
            You are an Excel data analyst. Analyze the following data and answer the user's query.
            
            Worksheet: ${worksheet.name}
            Headers: ${mappedHeaders.join(", ")}
            Total rows: ${rows.length}
            Sample data: ${JSON.stringify(rows.slice(0, 3))}
            
            User Query: ${query}
            
            Provide a helpful response based on the data structure and the user's question.
            If you can't perform the exact analysis requested, explain what you can see in the data
            and suggest what kind of analysis might be possible.
          `,
        })
        
        return text
      }
    } catch (error) {
      console.error("Query processing error:", error)
      
      // Handle specific tool validation errors
      if (error instanceof Error && error.message && error.message.includes("tool call validation failed")) {
        return `I encountered an issue with the tool parameters. Let me try a different approach to answer your query: "${query}". Please try rephrasing your question or ask for a specific type of analysis (like filtering, sorting, or aggregating data).`
      }
      
      throw new Error(`Query processing failed: ${error}`)
    }
  }

  private async mergeWorksheets(worksheetIds: string[], mergeType: 'union' | 'intersection') {
    const worksheets = []
    
    for (const id of worksheetIds) {
      const { data } = await supabase
        .from('worksheets')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) {
        worksheets.push(data)
      }
    }

    if (worksheets.length === 0) {
      throw new Error('No worksheets found')
    }

    // Simple merge logic - in production, you'd want more sophisticated merging
    const allHeaders = new Set<string>()
    const allRows: any[][] = []

    worksheets.forEach(ws => {
      ws.headers.forEach((h: string) => allHeaders.add(h))
      allRows.push(...ws.data)
    })

    return {
      mergedHeaders: Array.from(allHeaders),
      mergedRows: allRows,
      sourceWorksheets: worksheets.map(ws => ws.name),
      mergeType,
    }
  }

  private validateData(headers: string[], rows: any[][], column?: string) {
    const issues = []
    
    if (column) {
      const colIndex = headers.findIndex(h => h.toLowerCase().includes(column.toLowerCase()))
      if (colIndex !== -1) {
        const values = rows.map(row => row[colIndex])
        const nullCount = values.filter(v => v === null || v === undefined || v === '').length
        const uniqueCount = new Set(values).size
        
        issues.push({
          column,
          nullCount,
          uniqueCount,
          totalCount: values.length,
          nullPercentage: (nullCount / values.length) * 100,
        })
      }
    } else {
      headers.forEach((header, index) => {
        const values = rows.map(row => row[index])
        const nullCount = values.filter(v => v === null || v === undefined || v === '').length
        
        if (nullCount > 0) {
          issues.push({
            column: header,
            nullCount,
            nullPercentage: (nullCount / values.length) * 100,
          })
        }
      })
    }

    return {
      validationIssues: issues,
      totalIssues: issues.length,
    }
  }

  private async saveQueryResult(fileId: string, worksheetId: string, query: string, result: any, sqlGenerated: string) {
    const { data, error } = await supabase
      .from('query_results')
      .insert({
        file_id: fileId,
        worksheet_id: worksheetId,
        query,
        result,
        sql_generated: sqlGenerated,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
} 
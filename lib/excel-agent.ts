import * as XLSX from "xlsx"
import { generateText, tool } from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"
import { ColumnMapper } from "./column-mapper"
import { ExcelTools } from "./excel-tools"

export class ExcelAgent {
  private columnMapper: ColumnMapper
  private excelTools: ExcelTools

  constructor() {
    this.columnMapper = new ColumnMapper()
    this.excelTools = new ExcelTools()
  }

  async processQuery(workbook: XLSX.WorkBook, worksheetName: string, query: string) {
    try {
      // Get worksheet data
      const worksheet = workbook.Sheets[worksheetName]
      if (!worksheet) {
        throw new Error(`Worksheet "${worksheetName}" not found`)
      }

      // Convert to JSON with header row
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      if (data.length === 0) {
        throw new Error("Worksheet is empty")
      }

      const headers = data[0] as string[]
      const rows = data.slice(1)

      // Map column names
      const mappedHeaders = this.columnMapper.mapColumns(headers)

      // Generate response using LLM with tools
      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt: `
          You are an Excel data analyst. Analyze the following data and answer the user's query.
          
          Worksheet: ${worksheetName}
          Headers: ${mappedHeaders.join(", ")}
          Total rows: ${rows.length}
          
          User Query: ${query}
          
          Use the available tools to process the data and provide a comprehensive answer.
          If you need to perform calculations, filtering, or aggregations, use the appropriate tools.
        `,
        tools: {
          read_worksheet: tool({
            description: "Read and preview worksheet data",
            parameters: z.object({
              limit: z.number().optional().describe("Number of rows to preview"),
            }),
            execute: async ({ limit = 10 }) => {
              return this.excelTools.readWorksheet(headers, rows, limit)
            },
          }),
          filter_data: tool({
            description: "Filter data based on conditions",
            parameters: z.object({
              column: z.string().describe("Column name to filter"),
              operator: z.enum([">", "<", ">=", "<=", "=", "!=", "contains"]),
              value: z.union([z.string(), z.number()]).describe("Value to filter by"),
            }),
            execute: async ({ column, operator, value }) => {
              return this.excelTools.filterData(headers, rows, column, operator, value)
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
              return this.excelTools.aggregateData(headers, rows, column, operation, groupBy)
            },
          }),
          sort_data: tool({
            description: "Sort data by column",
            parameters: z.object({
              column: z.string().describe("Column to sort by"),
              order: z.enum(["asc", "desc"]).default("asc"),
            }),
            execute: async ({ column, order }) => {
              return this.excelTools.sortData(headers, rows, column, order)
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
              return this.excelTools.createPivotTable(headers, rows, rowField, valueField, operation)
            },
          }),
        },
      })

      return text
    } catch (error) {
      throw new Error(`Query processing failed: ${error}`)
    }
  }
}

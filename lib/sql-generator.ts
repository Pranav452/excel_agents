import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export class SQLGenerator {

  async generateSQL(query: string, headers: string[], tableName: string = 'data'): Promise<{
    sql: string
    explanation: string
    parameters: any[]
  }> {
    try {
      const prompt = `
        You are a SQL expert. Convert the following natural language query to SQL.
        
        Table: ${tableName}
        Columns: ${headers.join(', ')}
        
        Natural Language Query: "${query}"
        
        Generate a valid SQL query that:
        1. Uses appropriate WHERE clauses for filtering
        2. Uses GROUP BY for aggregations when needed
        3. Uses ORDER BY for sorting when needed
        4. Handles date comparisons properly
        5. Uses appropriate aggregate functions (SUM, AVG, COUNT, etc.)
        
        Return only the SQL query, no explanations.
      `

      const { text: sql } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt: prompt,
      })

      // Extract parameters from the SQL (for parameterized queries)
      const parameters = this.extractParameters(sql)

      return {
        sql,
        explanation: `Generated SQL for: ${query}`,
        parameters
      }
    } catch (error) {
      throw new Error(`SQL generation failed: ${error}`)
    }
  }

  private extractParameters(sql: string): any[] {
    // Simple parameter extraction - in production, you'd want more sophisticated parsing
    const parameters: any[] = []
    
    // Extract quoted strings
    const stringMatches = sql.match(/'([^']*)'/g)
    if (stringMatches) {
      parameters.push(...stringMatches.map(match => match.slice(1, -1)))
    }

    // Extract numbers
    const numberMatches = sql.match(/\b\d+(?:\.\d+)?\b/g)
    if (numberMatches) {
      parameters.push(...numberMatches.map(match => parseFloat(match)))
    }

    return parameters
  }

  async validateSQL(sql: string, headers: string[]): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic SQL validation
    const upperSQL = sql.toUpperCase()

    // Check for basic SQL keywords
    if (!upperSQL.includes('SELECT')) {
      errors.push('Missing SELECT clause')
    }

    // Check for invalid column names
    const columnMatches = sql.match(/\b\w+\b/g) || []
    const invalidColumns = columnMatches.filter(col => 
      !headers.some(header => 
        header.toLowerCase().includes(col.toLowerCase()) || 
        col.toLowerCase().includes(header.toLowerCase())
      ) &&
      !['SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'AND', 'OR', 'NOT', 'AS', 'SUM', 'AVG', 'COUNT', 'MIN', 'MAX'].includes(col.toUpperCase())
    )

    if (invalidColumns.length > 0) {
      warnings.push(`Potentially invalid columns: ${invalidColumns.join(', ')}`)
    }

    // Check for basic syntax
    if (upperSQL.includes('WHERE') && !upperSQL.includes('AND') && !upperSQL.includes('OR')) {
      warnings.push('Consider using AND/OR for multiple conditions')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  async executeSQL(sql: string, data: any[][]): Promise<any[]> {
    // This is a simplified SQL executor for demonstration
    // In production, you'd want to use a proper SQL engine or database
    
    try {
      // For now, we'll return a mock result
      // In a real implementation, you'd parse the SQL and execute it against the data
      return [
        {
          message: "SQL execution would be implemented here",
          sql: sql,
          rowCount: data.length
        }
      ]
    } catch (error) {
      throw new Error(`SQL execution failed: ${error}`)
    }
  }
} 
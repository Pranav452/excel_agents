export class ExcelTools {
  readWorksheet(headers: string[], rows: any[][], limit = 10) {
    const preview = rows.slice(0, limit)
    return {
      headers,
      preview,
      totalRows: rows.length,
      previewRows: preview.length,
    }
  }

  filterData(headers: string[], rows: any[][], column: string, operator: string, value: string | number) {
    const columnIndex = headers.findIndex(
      (h) => h.toLowerCase().includes(column.toLowerCase()) || column.toLowerCase().includes(h.toLowerCase()),
    )

    if (columnIndex === -1) {
      throw new Error(`Column "${column}" not found`)
    }

    const filteredRows = rows.filter((row) => {
      const cellValue = row[columnIndex]

      switch (operator) {
        case ">":
          return Number(cellValue) > Number(value)
        case "<":
          return Number(cellValue) < Number(value)
        case ">=":
          return Number(cellValue) >= Number(value)
        case "<=":
          return Number(cellValue) <= Number(value)
        case "=":
          return cellValue == value
        case "!=":
          return cellValue != value
        case "contains":
          return String(cellValue).toLowerCase().includes(String(value).toLowerCase())
        default:
          return true
      }
    })

    return {
      filteredRows: filteredRows.slice(0, 100), // Limit results
      totalMatches: filteredRows.length,
      filter: { column, operator, value },
    }
  }

  aggregateData(headers: string[], rows: any[][], column: string, operation: string, groupBy?: string) {
    const columnIndex = headers.findIndex((h) => h.toLowerCase().includes(column.toLowerCase()))

    if (columnIndex === -1) {
      throw new Error(`Column "${column}" not found`)
    }

    if (!groupBy) {
      // Simple aggregation
      const values = rows.map((row) => Number(row[columnIndex])).filter((v) => !isNaN(v))

      let result: number
      switch (operation) {
        case "sum":
          result = values.reduce((a, b) => a + b, 0)
          break
        case "avg":
          result = values.reduce((a, b) => a + b, 0) / values.length
          break
        case "count":
          result = values.length
          break
        case "min":
          result = Math.min(...values)
          break
        case "max":
          result = Math.max(...values)
          break
        default:
          result = 0
      }

      return { operation, column, result, count: values.length }
    }

    // Group by aggregation
    const groupByIndex = headers.findIndex((h) => h.toLowerCase().includes(groupBy.toLowerCase()))

    if (groupByIndex === -1) {
      throw new Error(`Group by column "${groupBy}" not found`)
    }

    const groups: Record<string, number[]> = {}

    rows.forEach((row) => {
      const groupValue = String(row[groupByIndex])
      const value = Number(row[columnIndex])

      if (!isNaN(value)) {
        if (!groups[groupValue]) groups[groupValue] = []
        groups[groupValue].push(value)
      }
    })

    const results = Object.entries(groups).map(([group, values]) => {
      let result: number
      switch (operation) {
        case "sum":
          result = values.reduce((a, b) => a + b, 0)
          break
        case "avg":
          result = values.reduce((a, b) => a + b, 0) / values.length
          break
        case "count":
          result = values.length
          break
        case "min":
          result = Math.min(...values)
          break
        case "max":
          result = Math.max(...values)
          break
        default:
          result = 0
      }
      return { group, result, count: values.length }
    })

    return { operation, column, groupBy, results }
  }

  sortData(headers: string[], rows: any[][], column: string, order: "asc" | "desc") {
    const columnIndex = headers.findIndex((h) => h.toLowerCase().includes(column.toLowerCase()))

    if (columnIndex === -1) {
      throw new Error(`Column "${column}" not found`)
    }

    const sortedRows = [...rows].sort((a, b) => {
      const aVal = a[columnIndex]
      const bVal = b[columnIndex]

      // Try numeric comparison first
      const aNum = Number(aVal)
      const bNum = Number(bVal)

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return order === "asc" ? aNum - bNum : bNum - aNum
      }

      // String comparison
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()

      if (order === "asc") {
        return aStr.localeCompare(bStr)
      } else {
        return bStr.localeCompare(aStr)
      }
    })

    return {
      sortedRows: sortedRows.slice(0, 100), // Limit results
      totalRows: sortedRows.length,
      sortBy: { column, order },
    }
  }

  createPivotTable(headers: string[], rows: any[][], rowField: string, valueField: string, operation: string) {
    const rowIndex = headers.findIndex((h) => h.toLowerCase().includes(rowField.toLowerCase()))
    const valueIndex = headers.findIndex((h) => h.toLowerCase().includes(valueField.toLowerCase()))

    if (rowIndex === -1) throw new Error(`Row field "${rowField}" not found`)
    if (valueIndex === -1) throw new Error(`Value field "${valueField}" not found`)

    const pivot: Record<string, number[]> = {}

    rows.forEach((row) => {
      const rowValue = String(row[rowIndex])
      const value = Number(row[valueIndex])

      if (!isNaN(value)) {
        if (!pivot[rowValue]) pivot[rowValue] = []
        pivot[rowValue].push(value)
      }
    })

    const results = Object.entries(pivot).map(([row, values]) => {
      let result: number
      switch (operation) {
        case "sum":
          result = values.reduce((a, b) => a + b, 0)
          break
        case "count":
          result = values.length
          break
        case "avg":
          result = values.reduce((a, b) => a + b, 0) / values.length
          break
        default:
          result = 0
      }
      return { [rowField]: row, [operation]: result, count: values.length }
    })

    return {
      pivotTable: results,
      rowField,
      valueField,
      operation,
      totalGroups: results.length,
    }
  }
}

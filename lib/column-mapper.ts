export class ColumnMapper {
  private synonyms: Record<string, string[]> = {
    quantity: ["qty", "amount", "count", "number"],
    price: ["cost", "rate", "value", "amount"],
    revenue: ["sales", "income", "earnings"],
    customer: ["client", "buyer", "user"],
    date: ["time", "timestamp", "created"],
    product: ["item", "goods", "merchandise"],
    region: ["area", "location", "territory"],
    category: ["type", "class", "group"],
  }

  mapColumns(headers: string[]): string[] {
    return headers.map((header) => this.normalizeColumnName(header))
  }

  private normalizeColumnName(columnName: string): string {
    if (!columnName) return ""

    // Clean the column name
    let normalized = columnName.toString().toLowerCase().trim()

    // Remove special characters and extra spaces
    normalized = normalized
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    // Check for synonyms
    for (const [standard, synonyms] of Object.entries(this.synonyms)) {
      if (synonyms.some((synonym) => normalized.includes(synonym))) {
        return standard
      }
    }

    // Convert to snake_case
    return normalized.replace(/\s+/g, "_")
  }

  findBestMatch(searchColumn: string, availableColumns: string[]): string {
    const normalizedSearch = this.normalizeColumnName(searchColumn)

    // Exact match
    const exactMatch = availableColumns.find((col) => this.normalizeColumnName(col) === normalizedSearch)
    if (exactMatch) return exactMatch

    // Partial match
    const partialMatch = availableColumns.find(
      (col) =>
        this.normalizeColumnName(col).includes(normalizedSearch) ||
        normalizedSearch.includes(this.normalizeColumnName(col)),
    )
    if (partialMatch) return partialMatch

    // Fuzzy match using Levenshtein distance
    let bestMatch = availableColumns[0]
    let bestScore = Number.POSITIVE_INFINITY

    for (const col of availableColumns) {
      const score = this.levenshteinDistance(normalizedSearch, this.normalizeColumnName(col))
      if (score < bestScore) {
        bestScore = score
        bestMatch = col
      }
    }

    return bestMatch
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator)
      }
    }

    return matrix[str2.length][str1.length]
  }
}

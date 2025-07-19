"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileSpreadsheet, MessageSquare, Loader2, Table, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Worksheet {
  id: string
  name: string
}

interface ExcelPreview {
  headers: string[]
  preview: any[][]
  totalRows: number
  previewRows: number
}

interface QueryResult {
  text: string
  data?: any[]
  headers?: string[]
  type?: 'table' | 'text' | 'pivot'
}

export default function ExcelAgent() {
  const [file, setFile] = useState<File | null>(null)
  const [fileId, setFileId] = useState<string>("")
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])
  const [selectedWorksheetId, setSelectedWorksheetId] = useState("")
  const [excelPreview, setExcelPreview] = useState<ExcelPreview | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setLoading(true)
    setExcelPreview(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", uploadedFile)

      const response = await fetch("/api/upload-excel", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (data.fileId && data.worksheets) {
        setFileId(data.fileId)
        setWorksheets(data.worksheets)
        if (data.worksheets.length > 0) {
          setSelectedWorksheetId(data.worksheets[0].id)
          // Get preview for the first worksheet
          await getExcelPreview(data.worksheets[0].id)
        }
      }
    } catch (error) {
      console.error("Error uploading file:", error)
    } finally {
      setLoading(false)
    }
  }

  const getExcelPreview = async (worksheetId: string) => {
    try {
      const formData = new FormData()
      formData.append("worksheetId", worksheetId)

      const response = await fetch("/api/get-preview", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (data.headers && data.preview) {
        setExcelPreview({
          headers: data.headers,
          preview: data.preview,
          totalRows: data.totalRows,
          previewRows: data.previewRows
        })
      }
    } catch (error) {
      console.error("Error getting preview:", error)
    }
  }

  const handleWorksheetChange = async (worksheetId: string) => {
    setSelectedWorksheetId(worksheetId)
    await getExcelPreview(worksheetId)
  }

  const handleQuery = async () => {
    if (!fileId || !selectedWorksheetId || !query.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("fileId", fileId)
      formData.append("worksheetId", selectedWorksheetId)
      formData.append("query", query)

      const response = await fetch("/api/process-query", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      
      // Try to parse the result to see if it contains structured data
      let parsedResult: QueryResult = { text: data.result || data.error }
      
      try {
        const parsed = JSON.parse(data.result)
        
        // Check for different types of structured data
        if (parsed.filteredRows) {
          parsedResult = {
            text: data.result,
            data: parsed.filteredRows,
            headers: parsed.headers || parsed.filter?.column ? [parsed.filter.column, 'Value'] : [],
            type: 'table'
          }
        } else if (parsed.sortedRows) {
          parsedResult = {
            text: data.result,
            data: parsed.sortedRows,
            headers: parsed.headers || [],
            type: 'table'
          }
        } else if (parsed.pivotTable) {
          parsedResult = {
            text: data.result,
            data: parsed.pivotTable,
            headers: parsed.rowField && parsed.valueField ? [parsed.rowField, parsed.operation || 'sum'] : [],
            type: 'pivot'
          }
        } else if (parsed.results) {
          parsedResult = {
            text: data.result,
            data: parsed.results,
            headers: parsed.groupBy ? [parsed.groupBy, parsed.operation || 'result'] : [],
            type: 'table'
          }
        } else if (parsed.preview) {
          parsedResult = {
            text: data.result,
            data: parsed.preview,
            headers: parsed.headers || [],
            type: 'table'
          }
        }
      } catch (e) {
        // Result is plain text
        parsedResult = { text: data.result || data.error, type: 'text' }
      }
      
      setResult(parsedResult)
    } catch (error) {
      setResult({ text: "Error processing query: " + error, type: 'text' })
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = (data: any[], headers: string[], filename: string) => {
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        Array.isArray(row) 
          ? row.map(cell => `"${cell}"`).join(',')
          : headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exampleQueries = [
    "Show sales data for Q3 2024 where revenue > 50000",
    "Create pivot table showing total sales by region and product",
    "Find customers who haven't ordered in 6 months",
    "Calculate average order value by month",
    "Show top 10 products by revenue",
  ]

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Excel Intelligence Agent</h1>
        <p className="text-muted-foreground">
          Upload Excel files and query them using natural language powered by AI SDK and Groq
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Excel File Upload
            </CardTitle>
            <CardDescription>Upload Excel files up to 100MB with multiple worksheets support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <Input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="max-w-xs mx-auto" />
              {file && <p className="text-sm text-muted-foreground mt-2">Uploaded: {file.name}</p>}
            </div>

            {worksheets.length > 0 && (
              <div>
                <label className="text-sm font-medium">Select Worksheet:</label>
                <select
                  value={selectedWorksheetId}
                  onChange={(e) => handleWorksheetChange(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  {worksheets.map((worksheet) => (
                    <option key={worksheet.id} value={worksheet.id}>
                      {worksheet.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Query Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Natural Language Query
            </CardTitle>
            <CardDescription>Ask questions about your data in plain English</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter your query here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
            />
            <Button 
              onClick={handleQuery} 
              disabled={!fileId || !selectedWorksheetId || !query.trim() || loading} 
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Query"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Excel Preview Section */}
      {excelPreview && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              Excel Data Preview
            </CardTitle>
            <CardDescription>
              Showing {excelPreview.previewRows} of {excelPreview.totalRows} rows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <UITable>
                <TableHeader>
                  <TableRow>
                    {excelPreview.headers.map((header, index) => (
                      <TableHead key={index} className="font-semibold">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excelPreview.preview.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="text-sm">
                          {cell !== null && cell !== undefined ? String(cell) : ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </UITable>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example Queries */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Example Queries</CardTitle>
          <CardDescription>Click on any example to try it out</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {exampleQueries.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                className="text-left justify-start h-auto p-3 bg-transparent"
                onClick={() => setQuery(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Query Results</span>
              {result.data && result.headers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToExcel(result.data!, result.headers!, 'query-results')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export to Excel
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text Response */}
            {result.type === 'text' && (
              <Alert>
                <AlertDescription>
                  <pre className="whitespace-pre-wrap text-sm">{result.text}</pre>
                </AlertDescription>
              </Alert>
            )}

            {/* Table Results */}
            {result.type === 'table' && result.data && result.headers && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <UITable>
                    <TableHeader>
                      <TableRow>
                        {result.headers.map((header, index) => (
                          <TableHead key={index} className="font-semibold">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.data.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {Array.isArray(row) ? (
                            row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex} className="text-sm">
                                {cell !== null && cell !== undefined ? String(cell) : ''}
                              </TableCell>
                            ))
                          ) : (
                            result.headers!.map((header, cellIndex) => (
                              <TableCell key={cellIndex} className="text-sm">
                                {row[header] !== null && row[header] !== undefined ? String(row[header]) : ''}
                              </TableCell>
                            ))
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                </div>
                
                {/* Text explanation */}
                <Alert>
                  <AlertDescription>
                    <pre className="whitespace-pre-wrap text-sm">{result.text}</pre>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Pivot Table Results */}
            {result.type === 'pivot' && result.data && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <UITable>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(result.data[0] || {}).map((header, index) => (
                          <TableHead key={index} className="font-semibold">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.data.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {Object.values(row).map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="text-sm">
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                </div>
                
                {/* Text explanation */}
                <Alert>
                  <AlertDescription>
                    <pre className="whitespace-pre-wrap text-sm">{result.text}</pre>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

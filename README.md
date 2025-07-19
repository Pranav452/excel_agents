# 📊 Excel Intelligence Agent

An intelligent Excel processing agent built with Next.js, LangChain, and Groq API that transforms natural language queries into powerful data operations on Excel files.

## 🌟 Overview

The Excel Intelligence Agent is a sophisticated tool that allows users to interact with Excel files using natural language. Instead of manually filtering, sorting, or creating pivot tables, users can simply ask questions like "Show me sales data where revenue is greater than $50,000" and get instant results.

### Key Capabilities

- **🔍 Natural Language Processing**: Query Excel data using plain English
- **📈 Large File Support**: Handle 10,000+ rows efficiently with memory optimization
- **📋 Multi-Worksheet Navigation**: Work with complex Excel files containing multiple sheets
- **🧠 Smart Column Mapping**: Automatically handles different naming conventions and synonyms
- **⚡ Real-time Processing**: Fast query execution with streaming responses
- **🛠️ Advanced Operations**: Filtering, aggregations, sorting, and pivot table generation

## 🚀 Features

### Natural Language Queries
```
✅ "Show sales data for Q3 2024 where revenue > 50000"
✅ "Create pivot table showing total sales by region and product"
✅ "Find customers who haven't ordered in 6 months"
✅ "Calculate average order value by month"
✅ "Show top 10 products by revenue"
```

### LangChain Tools

#### Core Tools
- **read_worksheet()**: Preview and explore data
- **filter_data()**: Advanced filtering with multiple operators
- **aggregate_data()**: Sum, average, count, min/max operations
- **sort_data()**: Intelligent sorting by any column
- **pivot_table()**: Dynamic pivot table creation
- **write_results()**: Save query results to database

#### Advanced Tools
- **merge_worksheets()**: Combine multiple worksheets
- **data_validation()**: Validate data quality and identify issues
- **formula_evaluation()**: Evaluate Excel formulas
- **chart_generation()**: Generate data visualizations

### Smart Column Recognition
- Handles variations: `qty` → `quantity`, `amt` → `amount`
- Supports multiple formats: `snake_case`, `camelCase`, `Proper Case`
- Fuzzy matching for typos and inconsistencies
- Multilingual header support

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS
- **AI/ML**: LangChain.js, Groq API (Llama 3.1)
- **Database**: Supabase (PostgreSQL)
- **Excel Processing**: SheetJS (xlsx)
- **Icons**: Lucide React

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- Groq API key

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd excel-intelligence-agent
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Environment Configuration**
Create a `.env.local` file in the root directory:
```env
# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database Setup**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
   - Update your `.env.local` with the Supabase credentials

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

### Basic Workflow

1. **Upload Excel File**: Drag and drop or select an Excel file (.xlsx, .xls)
2. **Select Worksheet**: Choose from available worksheets in your file
3. **Ask Questions**: Type natural language queries about your data
4. **Get Results**: Receive intelligent analysis and data insights

### Example Queries

#### Data Filtering
```
"Show me all orders from 2024"
"Find products with price greater than $100"
"Display customers from California"
```

#### Aggregations
```
"What's the total revenue by month?"
"Calculate average order value"
"Count orders by status"
```

#### Advanced Analysis
```
"Create a pivot table of sales by region and product category"
"Show top 5 customers by total purchase amount"
"Find products that haven't sold in the last quarter"
```

## 📁 Project Structure

```
excel-intelligence-agent/
├── app/
│   ├── api/
│   │   ├── upload-excel/
│   │   │   └── route.ts          # File upload endpoint
│   │   └── process-query/
│   │       └── route.ts          # Query processing endpoint
│   ├── globals.css               # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main application page
├── lib/
│   ├── enhanced-excel-agent.ts  # Enhanced agent with Supabase
│   ├── excel-agent.ts           # Original agent logic
│   ├── column-mapper.ts         # Column name mapping
│   ├── excel-tools.ts           # Excel operation tools
│   ├── sql-generator.ts         # SQL generation from queries
│   └── supabase.ts              # Supabase client configuration
├── components/ui/               # shadcn/ui components
├── supabase-schema.sql          # Database schema
├── package.json
└── README.md
```

## 🔧 API Endpoints

### POST `/api/upload-excel`
Uploads and processes Excel files, stores in Supabase, returns file ID and worksheets.

**Request**: FormData with file
**Response**: 
```json
{
  "fileId": "uuid",
  "worksheets": ["Sheet1", "Sheet2"],
  "message": "File uploaded successfully"
}
```

### POST `/api/process-query`
Processes natural language queries against Excel data stored in Supabase.

**Request**: FormData with fileId, worksheetId, and query
**Response**:
```json
{
  "result": "Query results and analysis",
  "sqlGenerated": "SELECT * FROM data WHERE...",
  "explanation": "Generated SQL for: user query"
}
```

## 🧪 Development

### Adding New Tools

1. Create tool function in `lib/excel-tools.ts`
2. Add tool definition in `lib/excel-agent.ts`
3. Update the LLM prompt to include new capabilities

### Extending Column Mapping

Add new synonyms to the `synonyms` object in `lib/column-mapper.ts`:

```typescript
private synonyms: Record<string, string[]> = {
  // Add your custom mappings
  customField: ["custom", "field", "cf"],
}
```

## 🚨 Limitations & Considerations

- **File Size**: Optimized for files up to 100MB (as per assignment requirements)
- **Memory**: Large datasets are stored in Supabase for memory efficiency
- **API Limits**: Groq API rate limits may apply
- **Data Types**: Best performance with structured, tabular data
- **Languages**: Primarily optimized for English queries
- **Database**: Requires Supabase setup and configuration

## 🆕 Enhanced Features

### Database Storage
- Excel files are stored in Supabase PostgreSQL database
- Persistent storage allows for query history and file management
- Efficient handling of large datasets (10,000+ rows)

### SQL Generation
- Natural language queries are converted to SQL using LLM
- Generated SQL is stored with query results for transparency
- SQL validation and error handling

### Advanced Tools
- **merge_worksheets()**: Combine multiple worksheets from the same file
- **data_validation()**: Identify data quality issues and missing values
- **write_results()**: Save query results to database for history
- **formula_evaluation()**: Evaluate Excel formulas (planned)
- **chart_generation()**: Generate data visualizations (planned)


## 🔮 Roadmap

- [ ] Data visualization with charts
- [ ] Export processed data to Excel
- [ ] Multi-file comparison
- [ ] Advanced formula evaluation
- [ ] Real-time collaboration features
- [ ] Custom report generation

---

**Built with ❤️ using Next.js, LangChain, and Groq AI**
-- Excel Intelligence Agent Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Excel files table
CREATE TABLE excel_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Worksheets table
CREATE TABLE worksheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES excel_files(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL, -- Store worksheet data as JSON
    headers TEXT[] NOT NULL, -- Store column headers as array
    row_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query results table
CREATE TABLE query_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES excel_files(id) ON DELETE CASCADE,
    worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result JSONB NOT NULL, -- Store query results as JSON
    sql_generated TEXT, -- Store generated SQL query
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_excel_files_user_id ON excel_files(user_id);
CREATE INDEX idx_worksheets_file_id ON worksheets(file_id);
CREATE INDEX idx_query_results_file_id ON query_results(file_id);
CREATE INDEX idx_query_results_worksheet_id ON query_results(worksheet_id);
CREATE INDEX idx_query_results_created_at ON query_results(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE excel_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_results ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can customize based on your auth requirements)
CREATE POLICY "Allow all operations on excel_files" ON excel_files FOR ALL USING (true);
CREATE POLICY "Allow all operations on worksheets" ON worksheets FOR ALL USING (true);
CREATE POLICY "Allow all operations on query_results" ON query_results FOR ALL USING (true);

-- Functions for data validation
CREATE OR REPLACE FUNCTION validate_excel_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate file size (100MB limit)
    IF NEW.size > 100 * 1024 * 1024 THEN
        RAISE EXCEPTION 'File size exceeds 100MB limit';
    END IF;
    
    -- Validate file name
    IF NEW.name IS NULL OR LENGTH(NEW.name) = 0 THEN
        RAISE EXCEPTION 'File name cannot be empty';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for excel_files validation
CREATE TRIGGER validate_excel_file
    BEFORE INSERT OR UPDATE ON excel_files
    FOR EACH ROW
    EXECUTE FUNCTION validate_excel_data();

-- Function to get file statistics
CREATE OR REPLACE FUNCTION get_file_stats(file_uuid UUID)
RETURNS TABLE (
    total_worksheets INTEGER,
    total_rows BIGINT,
    total_queries INTEGER,
    last_query_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT w.id)::INTEGER as total_worksheets,
        COALESCE(SUM(w.row_count), 0)::BIGINT as total_rows,
        COUNT(q.id)::INTEGER as total_queries,
        MAX(q.created_at) as last_query_at
    FROM excel_files f
    LEFT JOIN worksheets w ON f.id = w.file_id
    LEFT JOIN query_results q ON f.id = q.file_id
    WHERE f.id = file_uuid
    GROUP BY f.id;
END;
$$ LANGUAGE plpgsql; 
export interface Result {
    rule_id: string
    long_id: string
    description: string
    severity: string
    location: CodeLocation
}

export interface CodeLocation {
    filename: string
    start_line: number
    end_line: number
}


export interface ResultSet {
    results: Result[]
}
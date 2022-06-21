import * as React from 'react';
import {ObservableArray, ObservableValue} from "azure-devops-ui/Core/Observable";
import {
    ColumnSorting,
    ISimpleTableCell,
    renderSimpleCell,
    SimpleTableCell,
    sortItems,
    SortOrder,
    Table,
    TableColumnLayout,
} from "azure-devops-ui/Table";
import {CodeLocation, Result, ResultSet} from "./tfsec";
import {ISimpleListCell} from "azure-devops-ui/List";
import {ITableColumn} from "azure-devops-ui/Components/Table/Table.Props";
import {Pill, PillSize, PillVariant} from "azure-devops-ui/Pill";
import {PillGroup} from "azure-devops-ui/PillGroup";
import {IColor} from "azure-devops-ui/Utilities/Color";

interface ResultsTableProps {
    set: ResultSet
}

interface ListResult extends ISimpleTableCell {
    long_id: ISimpleListCell
    description: ISimpleListCell
    severity: ISimpleListCell
    link: ISimpleListCell
    location: ISimpleListCell
}

const fixedColumns = [
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "severity",
        name: "Severity",
        readonly: true,
        renderCell: renderSeverity,
        width: 120,
        sortProps: {
            ariaLabelAscending: "Sorted by severity ascending",
            ariaLabelDescending: "Sorted by severity descending",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "long_id",
        name: "ID",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-15),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "description",
        name: "Description",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-25),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "location",
        name: "Location",
        readonly: true,
        renderCell: renderLocation,
        width: new ObservableValue(-25),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "link",
        name: "AVD Link",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-10),
    },

];

function severityToInt(s: string): number {
    switch (s) {
        case "CRITICAL":
            return 4
        case "HIGH":
            return 3
        case "MEDIUM":
            return 2
        case "LOW":
            return 1
        default:
            return 0
    }
}

function compareSeverity(a: string, b: string): number {
    return severityToInt(a) - severityToInt(b)
}

const sortFunctions = [
    (item1: ListResult, item2: ListResult): number => {
        return compareSeverity(item1.severity.text!, item2.severity.text!);
    },
    (item1: ListResult, item2: ListResult): number => {
        return item1.long_id.text!.localeCompare(item2.long_id.text!);
    },
    (item1: ListResult, item2: ListResult): number => {
        return item1.description.text!.localeCompare(item2.description.text!);
    },
    (item1: ListResult, item2: ListResult): number => {
        return item1.location.text!.localeCompare(item2.location.text!);
    },
    null,
];

export class ResultsTable extends React.Component<ResultsTableProps, {}> {

    private readonly results: ObservableArray<ListResult> = new ObservableArray<ListResult>([])

    constructor(props: ResultsTableProps) {
        super(props)
        this.results = new ObservableArray<ListResult>(convertResults(props.set.results))
        // sort by severity desc by default
        this.results.splice(
            0,
            this.results.length,
            ...sortItems<ListResult>(
                0,
                SortOrder.descending,
                sortFunctions,
                fixedColumns,
                this.results.value,
            )
        )
    }

    render() {

        const sortingBehavior = new ColumnSorting<ListResult>(
            (
                columnIndex: number,
                proposedSortOrder: SortOrder,
                event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>
            ) => {
                this.results.splice(
                    0,
                    this.results.length,
                    ...sortItems<ListResult>(
                        columnIndex,
                        proposedSortOrder,
                        sortFunctions,
                        fixedColumns,
                        this.results.value,
                    )
                )
            }
        );


        return (
            <Table
                selectableText={true}
                ariaLabel="Results Table"
                role="table"
                behaviors={[sortingBehavior]}
                columns={fixedColumns}
                itemProvider={this.results}
                containerClassName="h-scroll-auto"
            />
        )
    }
}

let severityColours: IColor[] = [
    {red: 0x42, green: 0x89, blue: 0x59},
    {red: 0x2a, green: 0x4f, blue: 0x87},
    {red: 0xf1, green: 0x8f, blue: 0x01},
    {red: 0xc7, green: 0x3e, blue: 0x1d},
    {red: 0x3b, green: 0x1f, blue: 0x2b},
]

function getSeverityColour(s: string): IColor {
    return severityColours[severityToInt(s)]
}

function renderSeverity(rowIndex: number, columnIndex: number, tableColumn: ITableColumn<ListResult>, tableItem: ListResult, ariaRowIndex?: number): JSX.Element {
    return <SimpleTableCell
        columnIndex={columnIndex}
        tableColumn={tableColumn}
        key={"col-" + columnIndex}
        contentClassName="fontWeightSemiBold font-weight-semibold fontSizeM font-size-m scroll-hidden"
    >
        <PillGroup className="flex-row severity-pill-group">
            <Pill
                color={getSeverityColour(tableItem.severity.text)}
                size={PillSize.regular}
                variant={PillVariant.colored}
                contentClassName={"severity-pill-content"}
            >
                {tableItem.severity.text}
            </Pill>
        </PillGroup>
    </SimpleTableCell>
}

function renderLocation(rowIndex: number, columnIndex: number, tableColumn: ITableColumn<ListResult>, tableItem: ListResult, ariaRowIndex?: number): JSX.Element {
    return <SimpleTableCell
        columnIndex={columnIndex}
        tableColumn={tableColumn}
        key={"col-" + columnIndex}
    >
        <code key={"col-" + columnIndex}>{tableItem.location.text}</code>
    </SimpleTableCell>
}

function convertLocation(loc: CodeLocation): ISimpleListCell {
    let combined = loc.filename + ":" + loc.start_line
    if (loc.start_line > loc.end_line) {
        combined += "-" + loc.end_line
    }
    return {
        text: combined.replace("/home/vsts/work/1/s/", "")
    }
}

function convertResults(input: Result[]): ListResult[] {
    let output: ListResult[] = []
    input.forEach(function (result: Result) {
        output.push({
            description: {
                text: result.description,
            },
            long_id: {
                text: result.long_id,
            },
            severity: {
                text: result.severity,
            },
            link: {
                text: result.rule_id.toUpperCase(),
                href: "https://avd.aquasec.com/misconfig/" + result.rule_id.toLowerCase(),
                hrefTarget: "_blank",
                hrefRel: "noopener",
                iconProps: {iconName: "NavigateExternalInline", ariaLabel: "External Link"}
            },
            location: convertLocation(result.location),
        })
    })
    return output
}

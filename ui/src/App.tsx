import * as React from 'react';
import {
    BuildRestClient,
    BuildServiceIds,
    BuildStatus,
    IBuildPageData,
    IBuildPageDataService
} from "azure-devops-extension-api/Build";
import * as SDK from "azure-devops-extension-sdk";
import * as API from "azure-devops-extension-api";
import {CommonServiceIds, IProjectInfo, IProjectPageService} from "azure-devops-extension-api";
import {TimelineRecord} from "azure-devops-extension-api/Build/Build";
import {ResultSet} from './tfsec'
import {Loading} from './Loading'
import {ResultsTable} from './ResultsTable'
import {Crash} from './Crash'

type AppState = {
    status: BuildStatus
    error: string
    resultSet: ResultSet
    sdkReady: boolean
}

export class App extends React.Component<{}, AppState> {

    private buildClient: BuildRestClient;
    private project: IProjectInfo;
    private buildPageData: IBuildPageData;

    constructor(props) {
        super(props)
        this.state = {
            sdkReady: false,
            status: BuildStatus.None,
            error: "",
            resultSet: {
                results: []
            }
        }
    }

    async check() {

        let build = await this.buildClient.getBuild(this.project.id, this.buildPageData.build.id)
        if ((build.status & BuildStatus.Completed) === 0) {
            this.setState({status: build.status})
            setTimeout(this.check.bind(this), 5000)
            return
        }

        let timeline = await this.buildClient.getBuildTimeline(this.project.id, build.id)
        let recordId = ""
        timeline.records.forEach(function (record: TimelineRecord) {
            if (record.type == "Task" && record.name == "tfsec") {
                recordId = record.id
            }
        })
        if (recordId === "") {
            this.setState({error: "Timeline record missing: cannot load results. Is tfsec configured to run on this build?"})
            return
        }
        let attachments = await this.buildClient.getAttachments(this.project.id, build.id, "JSON_RESULT")
        if (attachments.length === 0) {
            this.setState({error: "No attachments found: cannot load results. Did tfsec run properly?"})
            return
        }
        let attachment = attachments[0];
        let data = await this.buildClient.getAttachment(this.project.id, build.id, timeline.id, recordId, "JSON_RESULT", attachment.name)
        let resultSet = this.decodeResultSet(data)
        this.setState({status: build.status, resultSet: resultSet})
    }

    setError(msg: string) {
        this.setState({error: msg})
    }

    async componentDidMount() {
        let comp = this;
        setTimeout(function () {
            if (!comp.state.sdkReady) {
                comp.setError.bind(comp)("Azure DevOps SDK failed to initialise.")
            }
        }, 5000)
        SDK.init().then(() => {
            SDK.ready().then(async () => {
                this.setState({sdkReady: true})
                const buildPageService: IBuildPageDataService = await SDK.getService(BuildServiceIds.BuildPageDataService);
                this.buildPageData = await buildPageService.getBuildPageData();
                const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
                this.project = await projectService.getProject();
                this.buildClient = API.getClient(BuildRestClient)
                await this.check()
            }).catch((e) => comp.setError.bind(comp)("Azure DevOps SDK failed to enter a ready state: " + e))
        }).catch((e) => comp.setError.bind(comp)("Azure DevOps SDK failed to initialise: " + e))
    }

    decodeResultSet(buffer: ArrayBuffer): ResultSet {
        let output = '';
        const arr = new Uint8Array(buffer);
        const len = arr.byteLength;
        for (let i = 0; i < len; i++) {
            output += String.fromCharCode(arr[i]);
        }
        return JSON.parse(output);
    }

    // render will know everything!
    render() {
        return (
            this.state.status == BuildStatus.Completed ?
                <ResultsTable set={this.state.resultSet}/>
                :
                (this.state.error !== "" ?
                        <Crash message={this.state.error}/>
                        :
                        <Loading status={this.state.status}/>
                )
        )
    }
}

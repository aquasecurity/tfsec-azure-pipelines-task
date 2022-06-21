import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import {App} from "./App"

ReactDOM.render(
    <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral }}>
        <App />
    </SurfaceContext.Provider>,
    document.getElementById("root"),
)


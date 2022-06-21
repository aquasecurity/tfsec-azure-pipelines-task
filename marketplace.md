# tfsec

![Screenshot showing the tfsec extension in the Azure Devops UI](screenshot.png)

## Installation

1. Install the tfsec task (`AquaSecurityOfficial/tfsec`) in your Azure DevOps organization.

2. Add the task to your `azure-pipelines.yml`:

```yaml
- task: tfsec@0.4.15
  inputs:
    version: 'v1.26.0'
```


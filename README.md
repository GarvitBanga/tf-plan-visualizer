# Terraform Plan Visualizer

Turns Terraform plan output into visual diagrams and change summaries for PR reviews.

## What it does

- **Visual diagrams** - Shows resource relationships with Mermaid graphs
- **Change summaries** - Clear tables of creates, updates, replaces, destroys
- **Risk warnings** - Highlights dangerous operations
- **Sticky comments** - Updates existing PR comments instead of spamming

## Quick start

Add this to your `.github/workflows/terraform-plan.yml`:

```yaml
name: Terraform Plan Visualizer
on:
  pull_request:
    paths: ['**/*.tf', '**/*.tfvars']

jobs:
  visualize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Visualize Terraform Plan
        uses: your-username/terraform-visualizer@v0.1.0
        with:
          working-directory: infra
          max-destroy: 0
          max-replace: 2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Configuration

| Input | Description | Default |
|-------|-------------|---------|
| `working-directory` | Terraform files location | `.` |
| `terraform-version` | Terraform version | `1.7.5` |
| `max-destroy` | Max destroys allowed (0 = fail on any) | `0` |
| `max-replace` | Max replaces allowed | `0` |
| `var-file` | Variable files | - |

## Example output

```markdown
## Terraform Plan Visualizer

### Resource Graph
```mermaid
graph TD
  node_0["aws_instance.web +"]:::create
  node_1["aws_vpc.main +"]:::create
```

### Change Summary
| Action | Count |
|--------|-------|
| + Create | 2 |

### Top Changes
- + `aws_instance.web` create
- + `aws_vpc.main` create
```

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT 
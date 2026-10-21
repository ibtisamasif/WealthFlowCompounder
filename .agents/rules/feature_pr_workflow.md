# Feature Implementation & Automated PR Workflow

## Mandatory Workflow for Every Feature Implementation
Whenever a new feature, enhancement, or calculation fix is implemented in this codebase, the agent MUST adhere to the following mandatory workflow:

### 1. Branching
- **Never commit directly to `master`** for new features.
- Create a dedicated feature branch with a descriptive name, e.g.:
  ```bash
  git checkout -b feat/<feature-name>
  ```

### 2. Implementation
- Implement the requested feature cleanly in the codebase (`index.html`, `networth.html`, `src/calculator.js`, etc.).
- Maintain documentation integrity and preserve existing comments.

### 3. Write Automated Test Cases
- For every feature implemented, write or update test cases under the `tests/` directory:
  - Compounding/financial math: `tests/calculator.test.js`
  - Portfolio split & non-growth asset rules: `tests/portfolio.test.js`
  - Formatting & privacy masking: `tests/formatters.test.js`
  - Net worth & gold conversions: `tests/networth.test.js`
  - Browser script integrity: `tests/index_integrity.test.js`
- Test both expected standard flows and edge cases (boundary values, 0% returns, negative values, large numbers).

### 4. Run & Pass All Tests
- Execute the test suite using:
  ```bash
  npm test
  ```
- **Halting Rule**: All tests must pass with 0 failures before opening a Pull Request. If any test fails, fix the code or test before proceeding.

### 5. Automated Pull Request Generation
- Generate the Pull Request automatically using the PR script:
  ```bash
  node scripts/create_pr.js --title "feat: <concise feature summary>"
  ```
  Or via `npm run pr -- --title "..."`.
- The script automatically:
  - Runs the test suite
  - Commits the staged files
  - Pushes the branch to `origin`
  - Opens a Pull Request against `master` via GitHub API with an automated test report
- The PR URL is output to stdout.

### 6. Report to User
- Provide the user with:
  - The clickable Pull Request link (e.g. `https://github.com/ibtisamasif/WealthFlowCompounder/pull/...`)
  - The feature branch name
  - Summary of changes implemented
  - Summary of automated test cases added and verification results

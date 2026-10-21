# WealthFlowCompounder Development Guidelines for AI Agents

## Mandatory Rule: Automated Test Cases & PR Generation
For every feature or functional modification requested by the user:

1. **Feature Branch**: Create a dedicated git branch (`feat/<feature-name>`). Do not make unreviewed commits directly to `master`.
2. **Automated Test Cases**: Add unit/integration tests in `tests/` covering the new feature and edge cases.
3. **Test Verification**: Execute `npm test` and verify that all test suites pass with 0 failures.
4. **Automated Pull Request**: Run `node scripts/create_pr.js --title "<feature summary>"` to push the branch and open a Pull Request via GitHub REST API.
5. **User Confirmation**: Present the user with the PR URL, summary of changes, and test results.

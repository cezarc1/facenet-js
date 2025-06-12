# Contributing to FaceNet.js

First off, thank you for considering contributing to FaceNet.js! It's people like you that make FaceNet.js such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps which reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs if possible**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

1. Fork and clone the repo

   ```bash
   git clone https://github.com/your-username/facenet-js.git
   cd facenet-js
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Run tests

   ```bash
   npm test
   ```

4. Build the library

   ```bash
   npm run build
   ```

## Coding Standards

- We use TypeScript for type safety
- Run `npm run lint` to check code style
- Run `npm run format` to auto-format code
- Write tests for new features
- Keep PR scope small and focused

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Include both positive and negative test cases
- Test edge cases

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments to all public APIs
- Include code examples in documentation
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format

## Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

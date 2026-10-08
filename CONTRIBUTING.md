# Contributing to Red Moon

Thank you for your interest in contributing to **Red Moon**! We welcome contributions from developers worldwide to make personal media streaming faster, more private, and visually breathtaking.

---

## Code of Conduct

By participating in this project, you agree to treat everyone with respect, maintain constructive collaboration, and adhere to welcoming open-source standards.

---

## Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or later (Node 22 LTS recommended)
- `npm` v9 or higher
- Optional: [Tailscale](https://tailscale.com/) installed for peer-to-peer mobile streaming testing

### Quickstart
1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/Red_Moon.git
   cd Red_Moon
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development environment:
   ```bash
   # Terminal 1: Backend Server (Port 5000)
   node server/index.js

   # Terminal 2: Frontend Vite Dev Server (Port 5173)
   npm run dev
   ```

4. Run a production build:
   ```bash
   npm run build
   ```

---

## Branching & Commit Guidelines

We follow **Conventional Commits**:

- `feat:` A new feature (e.g., `feat(audio): add parametric equalizer presets`)
- `fix:` A bug fix (e.g., `fix(player): handle Safari HLS audio sync`)
- `docs:` Documentation only changes (e.g., `docs: update tailscale setup guide`)
- `refactor:` Code restructuring that does not change behavior
- `test:` Adding or updating tests
- `chore:` Build scripts or dependency updates

### Submitting a Pull Request
1. Create a feature branch: `git checkout -b feat/your-feature-name`
2. Ensure `npm run build` passes with zero errors.
3. Commit your changes with a clear conventional commit message.
4. Push to your fork: `git push origin feat/your-feature-name`
5. Open a Pull Request against `main`.

---

## Questions and Discussions

Have questions or ideas? Start a discussion in [GitHub Discussions](https://github.com/Priyanshu459/Red_Moon/discussions) or open an issue!

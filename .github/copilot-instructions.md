### useEffect rules
- Keep useEffect to a minimum — if you find yourself writing one, ask whether
  derived state, an event handler, or a custom hook would be cleaner
- Never use useEffect to sync one piece of state to another (cyclical dependency risk)
- If useEffect is necessary, always clean up subscriptions and listeners

### Code style
- Minimal but well documented — every function should have a one-line JSDoc comment
  explaining what it does and why, not how
- Meaningful variable names, no abbreviations
- Early returns over nested conditionals
- Delete dead code — do not comment it out


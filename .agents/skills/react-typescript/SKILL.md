---
name: react-typescript
description: Provides best practices, design patterns, and type-safety guidelines for React and TypeScript applications. Use when designing, refactoring, or reviewing React components, custom hooks, state management, or Next.js implementations.
---

# React + TypeScript Skill

This skill enforces idiomatic patterns, strict type-safety, optimal performance, and clean architectural design for modern React applications using TypeScript and Next.js.

## When to Use This Skill
- Creating new React components, pages, or layouts.
- Developing custom hooks and state management abstractions.
- Refactoring legacy React code to strict TypeScript.
- Debugging React lifecycle issues, stale closures, re-render cascades, or type errors.
- Designing component component libraries or reusable UI primitives.

---

## 1. Type-Safe Component Architecture

### Proper Prop Typing
Always define explicit interfaces or types for component props. Avoid inline untyped objects or `any`.

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...rest}
    >
      {isLoading ? <Spinner size="sm" /> : children}
    </button>
  );
}
```

### Discriminated Unions for Variant Props
Use discriminated unions when props depend on each other, preventing impossible states at compile-time:

```tsx
type AlertProps =
  | { variant: 'dismissible'; onClose: () => void; message: string }
  | { variant: 'static'; onClose?: never; message: string };

export function Alert(props: AlertProps) {
  return (
    <div className={`alert alert-${props.variant}`}>
      <span>{props.message}</span>
      {props.variant === 'dismissible' && (
        <button onClick={props.onClose} aria-label="Close">×</button>
      )}
    </div>
  );
}
```

### Generic Components
For table rows, dropdown select items, or searchable pickers, use TypeScript generics:

```tsx
interface SelectProps<T> {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  selectedItem: T | null;
  onSelect: (item: T) => void;
}

export function Select<T>({
  items,
  getKey,
  getLabel,
  selectedItem,
  onSelect,
}: SelectProps<T>) {
  return (
    <ul role="listbox">
      {items.map((item) => {
        const key = getKey(item);
        const isSelected = selectedItem ? getKey(selectedItem) === key : false;
        return (
          <li
            key={key}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(item)}
          >
            {getLabel(item)}
          </li>
        );
      })}
    </ul>
  );
}
```

---

## 2. Hooks & State Management

### Exhaustive Reducer Types
When complex state transitions occur, favor `useReducer` with exhaustive discriminated unions over scattered `useState` calls:

```tsx
type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'SET_DISCOUNT'; payload: { percent: number } }
  | { type: 'RESET' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload.id) };
    case 'SET_DISCOUNT':
      return { ...state, discountPercent: action.payload.percent };
    case 'RESET':
      return initialCartState;
    default: {
      const _exhaustiveCheck: never = action;
      return state;
    }
  }
}
```

### Custom Hooks with Const Assertions
Ensure custom hooks returning tuples use `as const` so return types are inferred as fixed-length tuples, not unions of arrays:

```tsx
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return [value, { toggle, setTrue, setFalse }] as const;
}
```

### Avoid Redundant State
Calculate derived data during rendering rather than synchronizing it into state via `useEffect`:

```tsx
// ❌ ANTI-PATTERN: Redundant state + useEffect synchronization
const [items, setItems] = useState<Item[]>([]);
const [total, setTotal] = useState(0);
useEffect(() => {
  setTotal(items.reduce((acc, curr) => acc + curr.price, 0));
}, [items]);

// ✅ CORRECT: Inline derivation or useMemo for expensive operations
const [items, setItems] = useState<Item[]>([]);
const total = useMemo(() => {
  return items.reduce((acc, curr) => acc + curr.price, 0);
}, [items]);
```

---

## 3. Performance & Re-render Optimization

1. **Keep Component Hierarchies Shallow and Modular**: Extract high-frequency updating elements into leaf components so only the leaf re-renders.
2. **Proper Memoization**:
   - Use `useCallback` when passing callbacks to memoized children (`React.memo`).
   - Use `useMemo` for computationally heavy calculations ($O(N)$ large loops, regex, filtering).
   - Do not prematurely memoize primitive calculations or simple callbacks.
3. **List Virtualization**: For lists exceeding 100+ items (invoices, audit logs, customer registries), use windowing/virtualization (`@tanstack/react-virtual` or similar).
4. **Key Prop Integrity**: Never use `Math.random()` or array index as keys for dynamic lists where items can be re-ordered, added, or deleted. Always use a stable entity identifier (e.g., `item.id`).

---

## 4. Next.js & Modern Ecosystem Integration

- **Server vs. Client Components**:
  - Keep components Server Components by default.
  - Only declare `'use client'` when using React hooks (`useState`, `useEffect`), event listeners (`onClick`, `onChange`), or browser-only APIs (`window`, `localStorage`, `navigator`).
  - Pass server data down to client components via serializable props.
- **Audio & Media Effects**:
  - Manage Web Audio API or HTMLAudioElement references inside refs (`useRef`) to avoid recreating sound contexts on every render.
- **Client Storage Hydration**:
  - Guard `localStorage` access against SSR hydration mismatch errors using a mounted check (`useEffect(() => setMounted(true), [])`).

---

## 5. React + TypeScript Code Review Checklist
- [ ] No `any` types or loose `as unknown as Type` assertions.
- [ ] Props interface exported if intended for reuse or extension.
- [ ] Event handlers strictly typed (e.g. `React.ChangeEvent<HTMLInputElement>`).
- [ ] No missing dependencies in `useEffect`, `useCallback`, `useMemo` without documented justification.
- [ ] Cleanups implemented for timers (`clearTimeout`), subscriptions, and audio contexts.
- [ ] Error boundaries in place around external or failure-prone features.

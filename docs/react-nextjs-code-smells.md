# React & Next.js Official Code Smells

Patterns officially flagged by React (react.dev) and Vercel (nextjs.org) documentation as anti-patterns, pitfalls, or code smells. Each entry includes the source, what's wrong, and the correct pattern.

---

## React Code Smells

### 1. Derived state stored in useState + synced with useEffect

**Source:** react.dev/learn/you-might-not-need-an-effect

When a value can be calculated from existing props or state, don't put it in state. Calculate it during rendering.

```tsx
// Bad: redundant state + unnecessary Effect
const [firstName, setFirstName] = useState('Taylor');
const [lastName, setLastName] = useState('Swift');
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);

// Good: calculated during rendering
const [firstName, setFirstName] = useState('Taylor');
const [lastName, setLastName] = useState('Swift');
const fullName = firstName + ' ' + lastName;
```

**Why it's bad:** Causes an extra render cycle with stale values. The Effect runs after the first render with outdated fullName, then triggers a second render.

---

### 2. Adjusting state on prop change with useEffect

**Source:** react.dev/learn/you-might-not-need-an-effect

Using useEffect to reset or adjust state when a prop changes causes unnecessary re-renders and a flash of stale UI.

```tsx
// Bad: resetting state via Effect
function List({ items }) {
  const [selection, setSelection] = useState(null);
  useEffect(() => {
    setSelection(null);
  }, [items]);
}

// Good: derive or adjust during rendering
function List({ items }) {
  const [prevItems, setPrevItems] = useState(items);
  const [selection, setSelection] = useState(null);
  if (items !== prevItems) {
    setPrevItems(items);
    setSelection(null);
  }
}

// Best: use key prop to reset entire component
<List items={items} key={categoryId} />
```

**Why it's bad:** The component renders with stale selection first, then the Effect fires and triggers a second render with null selection.

---

### 3. Resetting all state when a prop changes (missing key prop)

**Source:** react.dev/learn/preserving-and-resetting-state

When you need to reset all state in a component because a prop changed, use a `key` prop instead of Effects.

```tsx
// Bad: manually resetting each piece of state
function ProfilePage({ userId }) {
  const [comment, setComment] = useState('');
  useEffect(() => {
    setComment('');
  }, [userId]);
}

// Good: key forces React to remount with fresh state
<ProfilePage userId={userId} key={userId} />
```

**Why it's bad:** Every piece of state needs its own reset Effect, and they're easy to forget as the component grows.

---

### 4. Chaining Effects that trigger each other

**Source:** react.dev/learn/you-might-not-need-an-effect

Multiple Effects where one sets state that triggers the next cause cascading renders and rigid logic.

```tsx
// Bad: chain of Effects triggering each other
useEffect(() => {
  if (card !== null && card.gold) {
    setGoldCardCount(c => c + 1);
  }
}, [card]);

useEffect(() => {
  if (goldCardCount > 3) {
    setRound(r => r + 1);
    setGoldCardCount(0);
  }
}, [goldCardCount]);

useEffect(() => {
  if (round > 5) {
    setIsGameOver(true);
  }
}, [round]);

// Good: calculate in the event handler
function handlePlaceCard(nextCard) {
  const newGoldCount = nextCard.gold ? goldCardCount + 1 : goldCardCount;
  const newRound = newGoldCount > 3 ? round + 1 : round;
  const newGoldAfterReset = newGoldCount > 3 ? 0 : newGoldCount;
  setCard(nextCard);
  setGoldCardCount(newGoldAfterReset);
  setRound(newRound);
  setIsGameOver(newRound > 5);
}
```

**Why it's bad:** Each Effect triggers a separate render. A chain of 4 Effects means 4 unnecessary re-renders instead of 1.

---

### 5. Notifying parent components via useEffect

**Source:** react.dev/learn/you-might-not-need-an-effect

Using an Effect to call a parent's callback when state changes runs too late and causes extra renders.

```tsx
// Bad: notifying parent via Effect
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);
  useEffect(() => {
    onChange(isOn);
  }, [isOn, onChange]);

  function handleClick() {
    setIsOn(!isOn);
  }
}

// Good: notify in the event handler
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);

  function handleClick() {
    const nextValue = !isOn;
    setIsOn(nextValue);
    onChange(nextValue);
  }
}
```

**Why it's bad:** The parent updates its state during the child's Effect, causing a second render pass. Batching in the event handler keeps it to one.

---

### 6. Copying props into state (prop-to-state sync)

**Source:** react.dev/learn/you-might-not-need-an-effect

Copying a prop into state and then syncing with useEffect is almost always wrong.

```tsx
// Bad: mirroring props in state
function List({ items }) {
  const [localItems, setLocalItems] = useState(items);
  useEffect(() => {
    setLocalItems(items);
  }, [items]);
}

// Good: use the prop directly, or useMemo if derived
function List({ items }) {
  const sortedItems = useMemo(() => items.sort(...), [items]);
}
```

**Why it's bad:** You now have two sources of truth that can get out of sync. The state lags behind the prop by one render.

---

### 7. Sending POST requests in useEffect

**Source:** react.dev/learn/you-might-not-need-an-effect

POST requests triggered by user actions belong in event handlers, not Effects. Effects run on mount and re-mount, causing duplicate requests.

```tsx
// Bad: POST in an Effect
useEffect(() => {
  fetch('/api/buy', { method: 'POST', body: JSON.stringify({ productId }) });
}, [productId]);

// Good: POST in an event handler
function handleBuy() {
  fetch('/api/buy', { method: 'POST', body: JSON.stringify({ productId }) });
}
```

**Why it's bad:** Effects fire on mount, re-mount, and during development Strict Mode (twice). User-triggered actions should only fire once in response to user intent.

---

### 8. Fetching data in useEffect without cleanup

**Source:** react.dev/learn/you-might-not-need-an-effect

Fetching in an Effect without a cleanup function causes race conditions when the component re-renders with different parameters.

```tsx
// Bad: no cleanup, race condition
useEffect(() => {
  fetch(`/api/user/${userId}`).then(r => r.json()).then(setUser);
}, [userId]);

// Good: abort stale requests
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/user/${userId}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(() => {});
  return () => controller.abort();
}, [userId]);

// Best: use a framework or library (Next.js server components, SWR, TanStack Query)
```

**Why it's bad:** If userId changes from 1 to 2 quickly, the response for userId=1 may arrive after userId=2, showing stale data.

---

### 9. Infinite loop: setting state in useEffect without deps

**Source:** react.dev/learn/synchronizing-with-effects

Setting state in an Effect without a dependency array causes an infinite render loop.

```tsx
// Bad: infinite loop
const [count, setCount] = useState(0);
useEffect(() => {
  setCount(count + 1);
});
```

**Why it's bad:** Every render triggers the Effect, which triggers a re-render, which triggers the Effect again, forever.

---

### 10. Defining components inside other components

**Source:** react.dev/learn/preserving-and-resetting-state

Defining a component function inside another component causes it to be recreated on every render, destroying all its state.

```tsx
// Bad: nested component definition
function Parent() {
  const [count, setCount] = useState(0);

  function MyInput() {
    const [text, setText] = useState('');
    return <input value={text} onChange={e => setText(e.target.value)} />;
  }

  return (
    <>
      <MyInput />
      <button onClick={() => setCount(count + 1)}>Click</button>
    </>
  );
}

// Good: define at module level
function MyInput() {
  const [text, setText] = useState('');
  return <input value={text} onChange={e => setText(e.target.value)} />;
}

function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <MyInput />
      <button onClick={() => setCount(count + 1)}>Click</button>
    </>
  );
}
```

**Why it's bad:** React sees a new component type on every render, unmounts the old instance (losing state), and mounts a fresh one.

---

### 11. Expensive computation without useMemo

**Source:** react.dev/learn/you-might-not-need-an-effect

Using useEffect to cache an expensive computation adds unnecessary complexity. Use useMemo instead.

```tsx
// Bad: Effect to cache expensive computation
const [todos, setTodos] = useState([]);
const [visibleTodos, setVisibleTodos] = useState([]);
useEffect(() => {
  setVisibleTodos(getFilteredTodos(todos, filter));
}, [todos, filter]);

// Good: useMemo for expensive derived values
const visibleTodos = useMemo(
  () => getFilteredTodos(todos, filter),
  [todos, filter]
);

// Also good: if the computation is cheap, skip useMemo
const visibleTodos = getFilteredTodos(todos, filter);
```

**Why it's bad:** The Effect causes an extra render with stale visibleTodos before the new value is computed.

---

### 12. Sharing logic between event handlers via useEffect

**Source:** react.dev/learn/you-might-not-need-an-effect

Using useEffect to run shared logic when state changes (instead of calling it directly in event handlers) makes the logic fire at the wrong time.

```tsx
// Bad: shared logic in Effect triggered by state change
useEffect(() => {
  if (product.isInCart) {
    showNotification(`Added ${product.name} to cart!`);
  }
}, [product]);

// Good: shared logic in a function called from event handlers
function addToCart(product) {
  cart.add(product);
  showNotification(`Added ${product.name} to cart!`);
}
```

**Why it's bad:** The notification fires on mount too (if the product is already in cart), not just when the user adds it.

---

## Next.js Code Smells (App Router)

### 13. Passing non-serializable props to Client Components

**Source:** nextjs.org/docs/app/api-reference/directives/use-client

Functions, class instances, and other non-serializable values cannot be passed from Server Components to Client Components.

```tsx
// Bad: passing a function from Server to Client Component
// Server Component
export default function Page() {
  function handleClick() { console.log('clicked'); }
  return <ClientButton onClick={handleClick} />; // Error
}

// Good: define the function inside the Client Component
// or use a Server Action
'use client';
export default function ClientButton() {
  function handleClick() { console.log('clicked'); }
  return <button onClick={handleClick}>Click</button>;
}
```

**Why it's bad:** Functions can't be serialized across the network boundary. React will throw a runtime error.

---

### 14. Adding "use client" too high in the component tree

**Source:** nextjs.org/docs/app/getting-started/server-and-client-components

Marking a parent component as "use client" makes the entire subtree client-side, losing the benefits of server-side rendering and data fetching.

```tsx
// Bad: entire page is client-side
'use client';
export default function Page() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <ExpensiveServerContent /> {/* This is now client-rendered */}
      <button onClick={() => setCount(count + 1)}>{count}</button>
    </div>
  );
}

// Good: push "use client" to the leaf
export default function Page() {
  return (
    <div>
      <ExpensiveServerContent /> {/* Server-rendered */}
      <Counter /> {/* Only this is client-side */}
    </div>
  );
}
```

**Why it's bad:** Server Components can fetch data, access the database, and keep large dependencies out of the client bundle. Making them client components undoes all of that.

---

### 15. Fetching data in Client Components when Server Components can do it

**Source:** nextjs.org/docs/app/getting-started/fetching-data

Using useEffect or SWR in a Client Component to fetch data that could be fetched in a Server Component adds a client-server waterfall.

```tsx
// Bad: client-side fetch with loading state
'use client';
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);
  if (!data) return <Loading />;
  return <Content data={data} />;
}

// Good: fetch in Server Component
export default async function Page() {
  const data = await getData();
  return <Content data={data} />;
}
```

**Why it's bad:** The browser downloads JS, hydrates, then makes a second request. Server Components fetch data before HTML is sent, eliminating the waterfall.

---

### 16. Using onClick/event handlers in Server Components

**Source:** nextjs.org/docs/app/getting-started/server-and-client-components

Server Components cannot use browser APIs, event handlers, or React hooks. These require a Client Component.

```tsx
// Bad: event handler in a Server Component (no "use client")
export default function Page() {
  return <button onClick={() => alert('hi')}>Click</button>; // Error
}

// Good: extract interactive parts into Client Components
import ClickButton from './click-button'; // "use client" component
export default function Page() {
  return <ClickButton />;
}
```

**Why it's bad:** Server Components render on the server. onClick requires JavaScript in the browser. React will throw a build error.

---

### 17. Importing server-only code in Client Components

**Source:** nextjs.org/docs/app/getting-started/server-and-client-components

Importing modules that use Node.js APIs (fs, database clients, secrets) in Client Components exposes them to the browser bundle.

```tsx
// Bad: database import in client component
'use client';
import { db } from '@/lib/database'; // Bundles DB credentials into client JS

// Good: use Server Actions or API routes
'use client';
import { getData } from '@/lib/actions'; // "use server" function
```

**Why it's bad:** Node.js modules fail in the browser, and secrets in database connection strings get bundled into client-visible JavaScript.

---

### 18. Not using loading.tsx / error.tsx for streaming boundaries

**Source:** nextjs.org/docs/app/api-reference/file-conventions

Missing loading.tsx means the entire page blocks until all data is fetched. Missing error.tsx means unhandled errors crash the entire page.

```
// Bad: no loading boundary
app/dashboard/page.tsx    (slow fetch blocks everything)

// Good: streaming with Suspense boundary
app/dashboard/loading.tsx (instant skeleton)
app/dashboard/page.tsx    (streams in when ready)
app/dashboard/error.tsx   (graceful error handling)
```

**Why it's bad:** Without loading.tsx, users see a blank page until the slowest query resolves. With it, they see an instant skeleton while data streams in.

---

### 19. Hydration mismatches from browser-dependent rendering

**Source:** react.dev/reference/react-dom/client/hydrateRoot (applies to Next.js SSR)

Rendering different content on server vs client (e.g., using Date, window, localStorage, Math.random) causes React hydration error #418.

```tsx
// Bad: different output on server vs client
function Timestamp() {
  return <span>{new Date().toLocaleString()}</span>;
  // Server renders in UTC, client renders in local timezone
}

// Good: explicit timezone for consistency
function Timestamp() {
  return (
    <span>
      {new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}
    </span>
  );
}

// Also good: render only on client with suppressHydrationWarning
function Timestamp() {
  const [time, setTime] = useState('');
  useEffect(() => { setTime(new Date().toLocaleString()); }, []);
  return <span suppressHydrationWarning>{time}</span>;
}
```

**Why it's bad:** React expects server HTML to match client render exactly. Mismatches cause error #418, may corrupt the DOM, and break interactivity.

---

### 20. Mutating state directly instead of creating new references

**Source:** react.dev/learn/updating-objects-in-state, react.dev/learn/updating-arrays-in-state

Mutating objects or arrays in state doesn't trigger re-renders because React uses reference equality to detect changes.

```tsx
// Bad: mutating state directly
const [user, setUser] = useState({ name: 'Taylor', age: 25 });
function handleBirthday() {
  user.age += 1; // Mutates existing object
  setUser(user); // Same reference, React skips re-render
}

// Good: create a new object
function handleBirthday() {
  setUser({ ...user, age: user.age + 1 });
}

// Bad: mutating array
const [items, setItems] = useState([1, 2, 3]);
items.push(4);
setItems(items); // Same reference

// Good: create new array
setItems([...items, 4]);
```

**Why it's bad:** React compares by reference. Same reference = no re-render, even if the contents changed. Your UI goes stale silently.

---

## Quick Reference Checklist

| # | Smell | Fix |
|---|-------|-----|
| 1 | Derived state in useState + useEffect | Calculate during render or useMemo |
| 2 | useEffect to adjust state on prop change | Derive during render or use key prop |
| 3 | useEffect to reset all state on prop change | Use key prop on the component |
| 4 | Chain of Effects triggering each other | Consolidate logic in event handler |
| 5 | useEffect to notify parent of state change | Call parent callback in event handler |
| 6 | Copying props into state | Use prop directly or useMemo |
| 7 | POST request in useEffect | Move to event handler |
| 8 | Data fetch in useEffect without cleanup | Add AbortController or use framework |
| 9 | setState in useEffect without deps | Add dependency array |
| 10 | Component defined inside another component | Define at module level |
| 11 | useEffect for expensive computation | Use useMemo |
| 12 | Shared event logic via useEffect | Extract to shared function |
| 13 | Non-serializable props to Client Components | Keep functions in Client Components |
| 14 | "use client" too high in tree | Push to leaf components |
| 15 | Client-side fetch when server can do it | Use Server Components |
| 16 | Event handlers in Server Components | Extract to Client Components |
| 17 | Server-only imports in Client Components | Use Server Actions |
| 18 | Missing loading.tsx / error.tsx | Add Suspense and error boundaries |
| 19 | Browser-dependent rendering (hydration mismatch) | Explicit timezone, suppressHydrationWarning |
| 20 | Mutating state directly | Create new object/array references |

---

*Sources: react.dev (official React documentation), nextjs.org (official Next.js documentation). All patterns verified against React 19 and Next.js 16.*

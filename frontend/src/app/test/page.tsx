export default function TestPage() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>WAR Server Test Page</h1>
      <p>If you see this page, the Next.js server is active and responding!</p>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/products">Products Catalog</a></li>
        <li><a href="/admin/products">Admin Products</a></li>
      </ul>
    </div>
  );
}

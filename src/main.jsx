import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const tabs = [
  { id: 'compare', label: '快速比价', icon: '⌁' },
  { id: 'history', label: '历史', icon: '◷' },
  { id: 'weight', label: '重量', icon: '▤' },
  { id: 'volume', label: '体积', icon: '◫' },
]

const blankForm = { name: '', amount: '', unit: 'g', price: '' }

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function App() {
  const [tab, setTab] = useState('compare')
  const [form, setForm] = useState(blankForm)
  const [items, setItems] = useState([])
  const [history, setHistory] = useState(() => read('unit-price-history', []))
  const [saved, setSaved] = useState(() => read('unit-price-saved', []))
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const persist = (key, value) => localStorage.setItem(key, JSON.stringify(value))
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  function addItem(event) {
    event.preventDefault()
    const amount = Number(form.amount)
    const price = Number(form.price)
    if (!Number.isFinite(amount) || amount <= 0) return setError('请输入大于 0 的规格数量')
    if (!Number.isFinite(price) || price < 0) return setError('请输入有效价格，价格不能小于 0')
    const item = { ...form, amount, price, id: makeId(), createdAt: Date.now() }
    const nextHistory = [item, ...history].slice(0, 10)
    setHistory(nextHistory)
    persist('unit-price-history', nextHistory)
    setItems((current) => [...current, item])
    setForm(blankForm)
    setError('')
  }

  function removeItem(id) { setItems((current) => current.filter((item) => item.id !== id)) }
  function restore(item) { setForm({ name: item.name, amount: String(item.amount), unit: item.unit, price: String(item.price) }); setTab('compare') }

  function deleteHistory(id) {
    const next = history.filter((item) => item.id !== id)
    setHistory(next); persist('unit-price-history', next)
  }

  function saveItem(item) {
    if (!item.name.trim()) return
    if (saved.some((entry) => entry.id === item.id)) return
    const next = [...saved, item]
    setSaved(next); persist('unit-price-saved', next)
    setToast('已保存到商品列表')
    window.setTimeout(() => setToast(''), 2200)
  }

  function deleteSaved(id) {
    const next = saved.filter((item) => item.id !== id)
    setSaved(next); persist('unit-price-saved', next)
  }

  return <div className="app-shell">
    <main>
      {tab === 'compare' && <Compare items={items} form={form} update={update} addItem={addItem} removeItem={removeItem} clearItems={() => setItems([])} saveItem={saveItem} error={error} />}
      {tab === 'history' && <History items={history} restore={restore} deleteHistory={deleteHistory} clear={() => { setHistory([]); persist('unit-price-history', []) }} />}
      {tab === 'weight' && <SavedList title="重量商品" unit="g" items={saved} restore={restore} deleteSaved={deleteSaved} />}
      {tab === 'volume' && <SavedList title="体积商品" unit="ml" items={saved} restore={restore} deleteSaved={deleteSaved} />}
    </main>
    {toast && <div className="toast" role="status">✓ {toast}</div>}
    <nav className="tabbar">{tabs.map((entry) => <button key={entry.id} className={tab === entry.id ? 'active' : ''} onClick={() => setTab(entry.id)}><span className="tab-icon">{entry.icon}</span>{entry.label}</button>)}</nav>
  </div>
}

function price(item) { return item.price / item.amount * 1000 }
function money(value) { return value.toFixed(2) }
function UnitPrice({ item }) { return <strong className="unit-price">{money(price(item))}<small> 元/{item.unit === 'g' ? 'kg' : '1L'}</small></strong> }

function Compare({ items, form, update, addItem, removeItem, clearItems, saveItem, error }) {
  const group = (unit) => items.filter((item) => item.unit === unit).sort((a, b) => price(a) - price(b))
  return <>
    <form className="entry-card" onSubmit={addItem}>
      <label>商品名称 <span>可选</span><input value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
      <div className="form-row"><label>规格<input inputMode="decimal" value={form.amount} onChange={(e) => update('amount', e.target.value)} /></label><label>单位<select value={form.unit} onChange={(e) => update('unit', e.target.value)}><option value="g">g</option><option value="ml">ml</option></select></label><label>价格<input inputMode="decimal" value={form.price} onChange={(e) => update('price', e.target.value)} /></label></div>
      {error && <p className="error">{error}</p>}<button className="primary" type="submit">添加到比价 <span>＋</span></button>
    </form>
    <section className="results"><div className="section-heading"><h3>当前比较 <span>{items.length}</span></h3>{items.length > 0 && <button className="text-button" onClick={clearItems}>清空</button>}</div>
      {items.length === 0 ? <div className="empty"><span>↗</span><p>还没有商品</p><small>先添加两个商品，看看谁更划算</small></div> : <><ResultGroup title="重量商品" unit="g" data={group('g')} removeItem={removeItem} saveItem={saveItem} /><ResultGroup title="体积商品" unit="ml" data={group('ml')} removeItem={removeItem} saveItem={saveItem} /></>}
    </section>
  </>
}

function ResultGroup({ title, unit, data, removeItem, saveItem }) { if (!data.length) return null; return <div className="result-group"><h4>{title}<span>元/{unit === 'g' ? 'kg' : '1L'}</span></h4>{data.map((item, index) => <article className={'product-card ' + (index === 0 ? 'winner' : '')} key={item.id}>{index === 0 && <i className="best-label">最划算</i>}<div className="rank">{index + 1}</div><div className="product-info"><b>{item.name || '未命名商品'}</b><span>{item.amount}{item.unit} · {money(item.price)}元</span></div><UnitPrice item={item} /><div className="card-actions"><button className="save-button" style={{ display: 'inline' }} onClick={() => saveItem(item)} disabled={!item.name} title={item.name ? '保存到收藏' : '填写商品名称后才能保存'}>{item.name ? '保存' : '需名称'}</button><button onClick={() => removeItem(item.id)} aria-label="删除">×</button></div></article>)}</div> }

function History({ items, restore, deleteHistory, clear }) { const data = [...items].sort((a, b) => b.createdAt - a.createdAt); return <section className="page-section"><div className="page-title"><p className="kicker">最近输入</p><div className="page-title-row"><h2>历史记录 <span>{items.length}/10</span></h2><button className="text-button" onClick={clear} disabled={!items.length}>清空</button></div></div>{data.length ? data.map((item) => <article className="list-card" key={item.id} onClick={() => restore(item)}><div><b>{item.name || '未命名商品'}</b><span>{item.amount}{item.unit} · {money(item.price)}元 · {new Date(item.createdAt).toLocaleDateString()}</span></div><UnitPrice item={item} /><button onClick={(e) => { e.stopPropagation(); deleteHistory(item.id) }}>×</button></article>) : <Empty text="还没有历史记录" />}</section> }
function SavedList({ title, unit, items, restore, deleteSaved }) { const data = items.filter((item) => item.unit === unit).sort((a, b) => b.createdAt - a.createdAt); return <section className="page-section"><div className="page-title"><p className="kicker">长期保存</p><h2>{title}</h2><p className="hint">手动保存的商品会出现在这里</p></div>{data.length ? data.map((item) => <article className="list-card" key={item.id} onClick={() => restore(item)}><div><b>{item.name}</b><span>{item.amount}{item.unit} · {money(item.price)}元</span></div><UnitPrice item={item} /><button onClick={(e) => { e.stopPropagation(); deleteSaved(item.id) }}>×</button></article>) : <Empty text={'还没有保存的' + title} />}</section> }
function Empty({ text }) { return <div className="empty"><span>＋</span><p>{text}</p><small>在快速比价中点击“保存”即可收藏</small></div> }

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

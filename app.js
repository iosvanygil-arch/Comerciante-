import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createProduct, upsertProduct, findProductByScan, nextInternalSku, validateImageFile, startCameraScanner } from './catalog.js';
import { createBook, addProduct, updateProductMaster, sale, purchase, expense, dailyIPV, saveDailyClosing, trialBalance } from './accounting.js';
import { listProductsLocal, saveProductLocal, deleteProductLocal } from './local-store.js';

const $ = id => document.getElementById(id);
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
let products = [], currentImage = null, stopScan = null;
let book = JSON.parse(localStorage.getItem('comerciante-book') || 'null') || createBook({date:today()});
const saveBook = () => localStorage.setItem('comerciante-book', JSON.stringify(book));
const money = n => new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0));
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function view(name){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===name));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===name));window.scrollTo(0,0);if(name==='products')renderProducts();if(name==='sales')renderSales();if(name==='purchases')renderPurchases();if(name==='expenses')renderExpenses();if(name==='dashboard')renderDashboard();}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.go)));
async function load(){products=await listProductsLocal();for(const p of products){if(!book.products[p.sku])addProduct(book,{sku:p.sku,name:p.name,qty:p.stock,unitCost:p.cost,salePrice:p.price});else p.stock=book.products[p.sku].qty;await saveProductLocal(p);}saveBook();renderDashboard();}
function renderDashboard(){ $('statProducts').textContent=products.length;$('statStock').textContent=money(products.reduce((a,p)=>a+Number(p.stock||0),0));$('statSales').textContent=book.sales.length; }
function renderProducts(){const q=$('searchProduct').value.trim().toLowerCase();const list=products.filter(p=>[p.name,p.sku,p.barcode,p.qrValue].some(v=>String(v||'').toLowerCase().includes(q)));$('productList').innerHTML=list.length?list.map(p=>`<article class="product"><div>${p.image?`<img src="${p.image}" alt="">`:'<div class="placeholder">▦</div>'}</div><div class="details"><b>${esc(p.name)}</b><small>${esc(p.sku||'Sin SKU')} · Stock: ${money(p.stock)}</small><small>${esc(p.barcode||'Sin código de barras')}</small></div><div class="amount">${money(p.price)}</div><button data-edit="${esc(p.id)}">Editar</button></article>`).join(''):'<div class="panel muted">No hay artículos todavía. Pulsa «Nuevo» para comenzar.</div>';document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));}
$('searchProduct').addEventListener('input',renderProducts);
function resetEditor(){ $('productEditor').reset();$('pSku').disabled=false;$('pId').value='';$('pSku').value=nextInternalSku(products);$('pStock').value='0';$('pCost').value='0';$('pPrice').value='0';$('pMin').value='0';$('pImage').value='';currentImage=null;$('imagePreview').hidden=true;$('photoHint').hidden=false;$('qrPreview').hidden=true;$('barPreview').hidden=true;$('deleteProduct').hidden=true;$('formTitle').textContent='Nuevo artículo';$('pQr').value='';$('pBarcode').value=''; }
$('newProduct').onclick=()=>{resetEditor();view('productForm');};
function editProduct(id){const p=products.find(x=>x.id===id);if(!p)return;resetEditor();$('formTitle').textContent='Editar artículo';$('pId').value=p.id;$('pSku').disabled=true;$('pName').value=p.name;$('pDescription').value=p.description||'';$('pSku').value=p.sku;$('pBarcode').value=p.barcode||'';$('pQr').value=p.qrValue||'';$('pCost').value=p.cost;$('pPrice').value=p.price;$('pStock').value=p.stock;$('pMin').value=p.minStock;$('pCategory').value=p.category||'';currentImage=p.image||null;if(currentImage){$('imagePreview').src=currentImage;$('imagePreview').hidden=false;$('photoHint').hidden=true;}$('deleteProduct').hidden=false;view('productForm');}
$('pImage').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{validateImageFile(f);currentImage=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});$('imagePreview').src=currentImage;$('imagePreview').hidden=false;$('photoHint').hidden=true;}catch(err){alert(err.message);e.target.value='';}};
$('makeQr').onclick=async()=>{let value=$('pQr').value.trim()||`COMERCIANTE:${$('pId').value||$('pSku').value}`;$('pQr').value=value;try{$('qrPreview').src=await QRCode.toDataURL(value,{width:300,margin:2});$('qrPreview').hidden=false;}catch(e){alert(e.message)}};
$('makeBar').onclick=()=>{const value=$('pBarcode').value.trim()||$('pSku').value.trim();if(!value){alert('Escribe primero un código interno o de barras');return;}if(!$('pBarcode').value)$('pBarcode').value=value;try{JsBarcode($('barPreview'),value,{format:'CODE128',displayValue:true,margin:8,height:65});$('barPreview').hidden=false;}catch(e){alert('No se pudo generar el código: '+e.message)}};
$('productEditor').onsubmit=async e=>{e.preventDefault();try{const id=$('pId').value||crypto.randomUUID();const input={id,name:$('pName').value,description:$('pDescription').value,sku:$('pSku').value.trim(),barcode:$('pBarcode').value.trim(),qrValue:$('pQr').value.trim(),image:currentImage,category:$('pCategory').value,cost:$('pCost').value,price:$('pPrice').value,stock:$('pStock').value,minStock:$('pMin').value};const next=upsertProduct(products,input);const p=next.find(x=>x.id===id);updateProductMaster(book,{sku:p.sku,name:p.name,qty:Number(p.stock),unitCost:Number(p.cost),salePrice:Number(p.price),date:today()});saveBook();await saveProductLocal(p);products=next;renderDashboard();view('products');}catch(err){alert(err.message)}};
$('deleteProduct').onclick=async()=>{const id=$('pId').value;if(!confirm('¿Eliminar este artículo del catálogo? Los movimientos contables ya registrados no se borrarán.'))return;await deleteProductLocal(id);products=products.filter(p=>p.id!==id);view('products');};
function renderPurchases(){ $('purchaseProduct').innerHTML='<option value="">Selecciona un artículo</option>'+products.map(p=>`<option value="${esc(p.sku)}">${esc(p.name)} · stock ${money(p.stock)}</option>`).join('');$('purchaseDate').value=today();$('purchaseCost').value='';$('purchasePaid').value=''; }
$('purchaseForm').onsubmit=async e=>{e.preventDefault();try{const sku=$('purchaseProduct').value,p=products.find(x=>x.sku===sku);if(!p)throw new Error('Selecciona un artículo');const qty=Number($('purchaseQty').value),cost=Number($('purchaseCost').value),paid=Number($('purchasePaid').value);const doc=purchase(book,{date:$('purchaseDate').value,sku,qty,unitCost:cost,paid,method:$('purchaseMethod').value});p.stock=book.products[sku].qty;p.cost=book.products[sku].unitCost/100;await saveProductLocal(p);saveBook();renderDashboard();renderPurchases();alert(`Compra registrada: ${doc}`);}catch(err){alert(err.message)}};
function renderExpenses(){ $('expenseDate').value=today(); }
$('expenseForm').onsubmit=e=>{e.preventDefault();try{const doc=expense(book,{date:$('expenseDate').value,description:$('expenseDescription').value,value:Number($('expenseValue').value),paid:Number($('expensePaid').value),method:$('expenseMethod').value});saveBook();e.target.reset();$('expenseDate').value=today();alert(`Gasto registrado: ${doc}`);}catch(err){alert(err.message)}};
let cart=[];
function renderSales(){
 $('saleDate').value=today(); $('posSearch').value=''; $('posCustomer').value=''; $('posWarranty').value='';
 cart=[]; renderCart(); renderRecent(); $('posSearch').focus();
}
function addToCart(p){
 if(!p) return;
 const line=cart.find(x=>x.sku===p.sku);
 if(line){if(line.qty+1>Number(p.stock))return alert('No hay existencias suficientes.');line.qty++;}
 else {if(Number(p.stock)<=0)return alert('Artículo sin existencias.');cart.push({sku:p.sku,qty:1,price:Number(p.price)});}
 renderCart();$('posSearch').value='';$('posMatches').innerHTML='';$('posSearch').focus();
}
function cartSum(){return cart.reduce((n,x)=>n+x.qty*x.price,0);}
function renderCart(){
 $('cartLines').innerHTML=cart.length?cart.map((x,i)=>{const p=products.find(v=>v.sku===x.sku);return `<div class="cartline"><div class="cartdesc"><b>${esc(p?.name||x.sku)}</b><small>Stock: ${money(p?.stock||0)} · ${money(x.price)} c/u</small></div><label class="cartqty">Cant.<input data-cartqty="${i}" type="number" min="0.0001" step="0.0001" max="${p?.stock||0}" value="${x.qty}"></label><strong>${money(x.qty*x.price)}</strong><button type="button" data-remove="${i}" aria-label="Quitar">×</button></div>`}).join(''):'<p class="muted">Añade artículos para comenzar.</p>';
 const total=cartSum();$('cartTotal').textContent=money(total);$('posReceived').value=total.toFixed(2);$('posChange').textContent=money(Math.max(0,Number($('posReceived').value||0)-total));$('completeSale').disabled=!cart.length;
 document.querySelectorAll('[data-cartqty]').forEach(el=>el.onchange=()=>{const i=Number(el.dataset.cartqty),q=Number(el.value),p=products.find(v=>v.sku===cart[i]?.sku);if(!p||!Number.isFinite(q)||q<=0||q>p.stock){alert('Cantidad inválida o superior al stock.');renderCart();return;}cart[i].qty=q;renderCart();});
 document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{cart.splice(Number(el.dataset.remove),1);renderCart();});
}
$('posSearch').oninput=()=>{const q=$('posSearch').value.trim().toLowerCase();if(!q){$('posMatches').innerHTML='';return;}const matches=products.filter(p=>[p.name,p.sku,p.barcode,p.qrValue].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,8);$('posMatches').innerHTML=matches.map(p=>`<button type="button" class="posmatch" data-addsku="${esc(p.sku)}"><span><b>${esc(p.name)}</b><small>${esc(p.sku)} · stock ${money(p.stock)}</small></span><strong>${money(p.price)}</strong></button>`).join('')||'<p class="muted">No se encontró el artículo.</p>';document.querySelectorAll('[data-addsku]').forEach(b=>b.onclick=()=>addToCart(products.find(p=>p.sku===b.dataset.addsku)));};
$('posSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const p=findProductByScan(products,$('posSearch').value.trim())||products.find(x=>x.name.toLowerCase()===$('posSearch').value.trim().toLowerCase());if(p)addToCart(p);}};
$('posReceived').oninput=()=>{$('posChange').textContent=money(Math.max(0,Number($('posReceived').value||0)-cartSum()));};
$('posMethod').onchange=()=>{if($('posMethod').value==='Crédito')$('posReceived').value='0';else $('posReceived').value=cartSum().toFixed(2);$('posChange').textContent=money(Math.max(0,Number($('posReceived').value||0)-cartSum()));};
$('clearCart').onclick=()=>{if(cart.length&&!confirm('¿Vaciar el carrito?'))return;cart=[];renderCart();};
$('completeSale').onclick=async()=>{
 try{
  if(!cart.length)throw new Error('El carrito está vacío.');
  const date=$('saleDate').value,method=$('posMethod').value,total=cartSum(),tender=Number($('posReceived').value);
  if(!date||!Number.isFinite(tender)||tender<0)throw new Error('Revisa la fecha y el importe recibido.');
  if(method==='Crédito'&&tender!==0)throw new Error('Para ventas a crédito, el importe recibido debe ser cero.');
  if(tender>total+0.000001)throw new Error('El importe recibido supera el total. Revisa el importe; el cambio se calcula para efectivo.');
  for(const line of cart){const p=products.find(x=>x.sku===line.sku);if(!p||line.qty>Number(p.stock))throw new Error('Stock insuficiente para '+(p?.name||line.sku));}
  let remaining=method==='Crédito'?0:tender, docs=[];
  for(let i=0;i<cart.length;i++){
   const line=cart[i],lineTotal=Number((line.qty*line.price).toFixed(2));
   const paid=i===cart.length-1?remaining:Number((total?lineTotal/total*(method==='Crédito'?0:tender):0).toFixed(2));
   const doc=sale(book,{date,sku:line.sku,qty:line.qty,total:lineTotal,received:paid,method:method==='Crédito'?'Crédito':method});
   remaining=Number((remaining-paid).toFixed(2));docs.push(doc);
  }
  for(const line of cart){const p=products.find(x=>x.sku===line.sku);p.stock=book.products[line.sku].qty;await saveProductLocal(p);}
  saveBook();renderDashboard();
  const receiptId=docs[0],customer=$('posCustomer').value.trim(),warranty=$('posWarranty').value.trim(),change=method==='Efectivo'?Math.max(0,tender-total):0;
  $('receiptPrint').innerHTML=`<div class="receiptinner"><h2>COMERCIANTE</h2><p>COMPROBANTE DE VENTA</p><p>Fecha: ${esc(date)}<br>Documento: ${esc(receiptId)}${docs.length>1?' + '+(docs.length-1)+' línea(s)':''}<br>Cliente: ${esc(customer||'Consumidor final')}</p><hr>${cart.map(x=>{const p=products.find(v=>v.sku===x.sku);return `<p>${esc(p?.name||x.sku)}<br>${x.qty} × ${money(x.price)} = <b>${money(x.qty*x.price)}</b></p>`}).join('')}<hr><h3>TOTAL: ${money(total)}</h3><p>Forma de cobro: ${esc(method)}<br>Recibido aplicado: ${money(total)}<br>${method==='Efectivo'?'Cambio: '+money(change):'Saldo pendiente: '+money(method==='Crédito'?total:0)}</p>${warranty?'<p>Garantía: '+esc(warranty)+'</p>':''}<p>Gracias por su compra.</p></div>`;
  cart=[];renderCart();renderRecent();$('posSearch').focus();
  if(confirm('Venta registrada. ¿Imprimir comprobante?'))window.print();
 }catch(err){alert(err.message);}
};
function renderRecent(){ $('recentSales').innerHTML=book.sales.slice(-8).reverse().map(s=>{const p=products.find(x=>x.sku===s.sku);return `<p>${esc(p?.name||s.sku)} · ${s.qty} · ${money(s.total/100)} · ${esc(s.date)}</p>`}).join('')||'<p class="muted">Todavía no hay ventas.</p>'; }
$('reportDate').value=today();$('runReport').onclick=()=>{try{const r=dailyIPV(book,$('reportDate').value,Number($('openingCash').value),Number($('countedCash').value));const vals=[['Ventas',r.sales],['Cobros del día',r.collections],['Ventas a crédito',r.creditSales],['Costo de ventas',r.costOfSales],['Utilidad bruta',r.grossProfit],['Compras',r.purchases],['Gastos',r.expenses],['Efectivo esperado',r.expectedCash],['Efectivo contado',r.countedCash],['Diferencia',r.difference]];$('reportResult').innerHTML=vals.map(([k,v])=>`<article class="metric"><small>${k}</small><strong>${money(v)}</strong></article>`).join('')+`<article class="metric"><small>Estado de caja</small><strong>${r.cashStatus}</strong></article>`;const tb=trialBalance(book);$('trialBalance').innerHTML=`Debe: ${money(tb.totalDebit)} · Haber: ${money(tb.totalCredit)} · Diferencia: ${money(tb.difference)} · ${tb.balanced?'Balanceado':'REVISAR'}`;saveDailyClosing(book,{date:r.date,openingCash:Number($('openingCash').value),countedCash:Number($('countedCash').value)});saveBook();}catch(e){alert(e.message)}};
$('exportBackup').onclick=()=>{const payload={app:'COMERCIANTE',version:'0.3.0',exportedAt:new Date().toISOString(),products,book};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`COMERCIANTE-respaldo-${today()}.json`;a.click();URL.revokeObjectURL(a.href);};
$('importBackup').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(data.app!=='COMERCIANTE'||!Array.isArray(data.products)||!data.book)throw new Error('Archivo no reconocido');if(!confirm('Esto reemplazará el catálogo y los movimientos actuales. ¿Continuar?'))return;for(const p of products)await deleteProductLocal(p.id);products=[];for(const p of data.products){await saveProductLocal(p);products.push(p);}book=data.book;saveBook();renderDashboard();alert('Copia restaurada correctamente.');}catch(err){alert('No se pudo restaurar: '+err.message)}e.target.value='';};
async function openScanner(){ $('scanner').hidden=false;$('scanStatus').textContent='Solicitando cámara…';try{stopScan=await startCameraScanner($('camera'),(value,format)=>{ $('scanStatus').textContent=`Código leído: ${value} (${format})`;const p=findProductByScan(products,value);if(p){$('scanner').hidden=true;stopScan?.();editProduct(p.id);}else $('manualCode').value=value;},err=>{$('scanStatus').textContent=err.message;});$('scanStatus').textContent='Cámara activa. Enfoca el código.';}catch(e){$('scanStatus').textContent=e.message;}}
$('scanOpen').onclick=openScanner;$('scanForm').onclick=openScanner;$('closeScanner').onclick=()=>{$('scanner').hidden=true;stopScan?.();};$('manualSearch').onclick=()=>{const p=findProductByScan(products,$('manualCode').value);if(p){$('scanner').hidden=true;stopScan?.();editProduct(p.id);}else $('scanStatus').textContent='No se encontró ese código en el catálogo.';};
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
load().catch(e=>alert('No se pudo abrir el almacenamiento local: '+e.message));

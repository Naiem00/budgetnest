import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, updateProfile, changePassword } from '../api/auth'
import '../App.css'

export default function Settings() {
  const navigate = useNavigate()
  const [profile,setProfile]=useState({name:'',email:'',countryCode:'JP',currencyCode:'JPY'})
  const [passwords,setPasswords]=useState({currentPassword:'',newPassword:''})
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const token=localStorage.getItem('budgetnest_token')
  useEffect(()=>{
    if(!token){navigate('/login');return}
    getCurrentUser(token).then(({user})=>setProfile({name:user.name,email:user.email,countryCode:user.country_code||'JP',currencyCode:user.currency_code||'JPY'}))
      .catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[token,navigate])
  function logout(){localStorage.removeItem('budgetnest_token');navigate('/login',{replace:true})}
  async function saveProfile(e){
    e.preventDefault();setSaving(true);setMessage('');setError('')
    try{
      const {user}=await updateProfile(token,profile)
      setProfile({name:user.name,email:user.email,countryCode:user.country_code||'JP',currencyCode:user.currency_code})
      setMessage('Profile saved. Historical transaction amounts have not been converted. New entries use your preferred currency.')
    }catch(err){setError(err.message)}finally{setSaving(false)}
  }
  async function savePassword(e){
    e.preventDefault();setSaving(true);setError('');setMessage('')
    try{
      await changePassword(token,passwords.currentPassword,passwords.newPassword)
      setPasswords({currentPassword:'',newPassword:''});setMessage('Password changed. Please sign in again.')
      logout()
    }catch(err){setError(err.message)}finally{setSaving(false)}
  }
  return <div className="app">
    <aside className="sidebar"><div><div className="logo"><span className="logoMark">B</span>BudgetNest</div>
      <nav>
        <button className="navItem" onClick={()=>navigate('/')}>▦ Dashboard</button>
        <button className="navItem" onClick={()=>navigate('/transactions')}>↕ Transactions</button>
        <button className="navItem" onClick={()=>navigate('/budgets')}>◎ Budgets</button>
        <button className="navItem" onClick={()=>navigate('/goals')}>☆ Goals</button><button className="navItem" onClick={()=>navigate('/reports')}>◔ Reports</button>
        <button className="navItem active">⚙ Settings</button>
      </nav></div></aside>
    <main className="main"><header className="topbar"><div><p className="eyebrow">ACCOUNT</p><h1>Settings</h1><p className="muted">Manage your profile and secure your account.</p></div></header>
      {loading ? <p className="muted">Loading profile...</p> : <>
        {error && <p role="alert" className="auth-error">{error}</p>}{message && <p role="status" className="positive">{message}</p>}
        <section className="panel"><h2>Profile & preferences</h2>
          <form className="settingsForm" onSubmit={saveProfile}>
            <label>Name<input required maxLength="100" value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label>
            <label>Email<input value={profile.email} disabled type="email" /></label>
            <label>Country<select value={profile.countryCode} onChange={e=>setProfile({...profile,countryCode:e.target.value})}><option value="JP">Japan</option><option value="BD">Bangladesh</option></select></label>
            <label>Preferred currency<select value={profile.currencyCode} onChange={e=>setProfile({...profile,currencyCode:e.target.value})}><option value="JPY">Japanese Yen (JPY)</option><option value="BDT">Bangladeshi Taka (BDT)</option></select></label>
            <p className="muted">Changing currency does not convert or relabel historical transactions. Reports and budget totals display records in the selected currency; previous records retain their original denomination.</p>
            <button disabled={saving}>{saving?'Saving...':'Save profile'}</button>
          </form>
        </section>
        <section className="panel"><h2>Change password</h2>
          <form className="settingsForm" onSubmit={savePassword}>
            <label>Current password<input type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={e=>setPasswords({...passwords,currentPassword:e.target.value})} required/></label>
            <label>New password<input type="password" autoComplete="new-password" minLength="8" value={passwords.newPassword} onChange={e=>setPasswords({...passwords,newPassword:e.target.value})} required/></label>
            <button disabled={saving}>{saving?'Please wait...':'Update password'}</button>
          </form>
        </section>
        <section className="panel"><h2>Account</h2><button className="cancelTransactionButton" onClick={logout}>Log out</button></section>
      </>}
    </main>
  </div>
}

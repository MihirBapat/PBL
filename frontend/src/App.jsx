import './index.css';
import { useState } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { ShieldAlert, ShieldCheck, UploadCloud, Activity } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gciData, setGciData] = useState(null);
  const [temporalData, setTemporalData] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload CSV & Run ML Pipeline
      const uploadRes = await axios.post(`${API_BASE}/upload-transactions`, formData);
      const borrowerId = uploadRes.data.borrower_id;

      // 2. Fetch Detailed Component Scores
      const gciRes = await axios.get(`${API_BASE}/gci/${borrowerId}`);
      setGciData(gciRes.data);

      // 3. Fetch Temporal Decomposition Arrays
      const tempRes = await axios.get(`${API_BASE}/temporal/${borrowerId}`);
      
      // Transform raw arrays into an object array for Recharts
      const formattedTemporal = tempRes.data.raw.map((val, index) => ({
        month: `Month ${index + 1}`,
        raw_income: val,
        trend: tempRes.data.trend[index] || 0,
        seasonal: tempRes.data.seasonal[index] || 0
      }));
      setTemporalData(formattedTemporal);

    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred connecting to the inference engine.");
    } finally {
      setLoading(false);
    }
  };

  // Format data for the Radar Chart
  const radarData = gciData ? [
    { metric: 'Stability', value: gciData.components.stability },
    { metric: 'Liquidity', value: gciData.components.liquidity },
    { metric: 'Discipline', value: gciData.components.discipline },
    { metric: 'Repayment', value: gciData.components.repayment }
  ] : [];

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#1a1a1a' }}>
      
      <header style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Activity size={32} color="#2563eb" /> 
          GCI Inference Dashboard
        </h1>
        <p style={{ color: '#666', marginTop: '5px' }}>Real-time credit assessment and anomaly detection.</p>
      </header>

      {/* Upload Control Plane */}
      <section style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input 
            type="file" 
            accept=".csv" 
            onChange={(e) => setFile(e.target.files[0])}
            style={{ padding: '10px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button 
            type="submit" 
            disabled={!file || loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <UploadCloud size={18} />
            {loading ? "Processing Pipeline..." : "Run Analysis"}
          </button>
        </form>
        {error && <p style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '15px' }}>{error}</p>}
      </section>

      {/* Results Dashboard */}
      {gciData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          
          {/* Top Level Metric */}
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#64748b' }}>Final GCI Score</h2>
            <div style={{ fontSize: '4rem', fontWeight: '900', color: '#0f172a', lineHeight: '1' }}>
              {gciData.gci_score}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '10px', borderRadius: '6px', background: gciData.manipulation_label === 'Clean' ? '#dcfce7' : '#fee2e2' }}>
              {gciData.manipulation_label === 'Clean' ? <ShieldCheck color="#16a34a" /> : <ShieldAlert color="#dc2626" />}
              <span style={{ fontWeight: '600', color: gciData.manipulation_label === 'Clean' ? '#166534' : '#991b1b' }}>
                System Flag: {gciData.manipulation_label}
              </span>
            </div>
          </div>

          {/* Component Radar Chart */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '300px' }}>
            <h3 style={{ margin: '0 0 10px 0', textAlign: 'center' }}>Risk Vector Breakdown</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Score" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Temporal Decomposition (M1 Output) */}
          {temporalData && (
            <div style={{ gridColumn: '1 / -1', background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '400px' }}>
              <h3 style={{ margin: '0 0 20px 0' }}>Income Temporal Decomposition (STL)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temporalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="raw_income" stroke="#94a3b8" strokeWidth={2} dot={false} name="Raw Income" />
                  <Line type="monotone" dataKey="trend" stroke="#2563eb" strokeWidth={3} dot={false} name="Underlying Trend" />
                  <Line type="monotone" dataKey="seasonal" stroke="#10b981" strokeWidth={2} dot={false} name="Seasonality" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
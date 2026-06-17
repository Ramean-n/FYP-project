import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMyApplications, signContract } from '../services/api';

const ContractSign = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await getMyApplications();
        const foundApp = res.data.find((app) => app.contract?.id === parseInt(contractId));
        if (foundApp) setContract({ ...foundApp.contract, _jobTitle: foundApp.job?.title, _jobId: foundApp.job?.id });
        else setError('Contract not found or you do not have access to it.');
      } catch {
        setError('Failed to load contract. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [contractId]);

  const handleSign = async () => {
    if (!agreed) return;
    setSigning(true);
    setError('');
    try {
      await signContract(contractId);
      setContract((prev) => ({ ...prev, signed: true, signed_at: new Date().toISOString() }));
      setSuccess('Contract signed successfully. Training is now available.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sign contract.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) return <div className="empty-state">Loading contract...</div>;

  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Participant Workflow</p>
          <h2>Participation Agreement</h2>
          <p>{contract?._jobTitle || `Contract #${contractId}`}</p>
        </div>
        {contract && <span className={`pill ${contract.signed ? 'success' : 'warning'}`}>{contract.signed ? 'Signed' : 'Awaiting signature'}</span>}
      </div>

      {error && <p className="form-alert danger">{error}</p>}
      {success && <p className="form-alert success">{success}</p>}

      {contract && (
        <>
          <section className="data-panel">
            <div className="section-heading-row">
              <div><h2>Contract Terms</h2><p>Read the full agreement before signing.</p></div>
            </div>
            <div className="document-box">{contract.content || 'No contract content available.'}</div>
          </section>

          <section className="data-panel workflow-panel">
            {contract.signed ? (
              <>
                <span className="pill success">Complete</span>
                <h2>You have signed this contract</h2>
                <p>Signed on {contract.signed_at ? new Date(contract.signed_at).toLocaleString() : 'recently'}.</p>
                <button className="btn btn-primary" type="button" onClick={() => navigate(`/participant/jobs/${contract._jobId}/training`)}>
                  Continue to Training
                </button>
              </>
            ) : (
              <>
                <label className="check-row">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span>I have read and understood the contract terms.</span>
                </label>
                <button className="btn btn-primary" type="button" onClick={handleSign} disabled={!agreed || signing}>
                  {signing ? 'Signing...' : 'Sign Contract'}
                </button>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
};

export default ContractSign;

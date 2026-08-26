import { useEffect, useState, useRef } from 'react';
import { FileCheck2, Upload, CheckCircle2, XCircle, Clock3, X, Download } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getMySubmissions, submitRequirementFile } from '../services/requirementService';

const statusConfig = {
  PENDING: { label: 'Pending Review', style: 'bg-yellow-50 text-sti-yellow-dark', Icon: Clock3 },
  APPROVED: { label: 'Approved', style: 'bg-sti-blue-50 text-sti-blue', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejected — Re-upload', style: 'bg-red-50 text-red-600', Icon: XCircle },
};

// Reads a File object into a base64 data URL for submission.
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Requirements = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const activeRequirementId = useRef(null);

  const loadData = async () => {
    try {
      const res = await getMySubmissions();
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerUpload = (requirementId) => {
    activeRequirementId.current = requirementId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('File is too large (max 8MB).');
      return;
    }

    setError('');
    setUploadingId(activeRequirementId.current);
    try {
      const fileData = await fileToBase64(file);
      await submitRequirementFile(activeRequirementId.current, file.name, fileData);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">Requirements</h1>
        <p className="text-sm text-sti-gray">Upload and track the documents needed for your OJT.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
          <X className="w-4 h-4" /> {error}
        </div>
      )}

      <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />

      {items.length === 0 ? (
        <Card className="text-center py-16">
          <FileCheck2 className="w-10 h-10 text-sti-gray mx-auto mb-3" />
          <p className="text-sti-gray text-sm">No requirements have been posted yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((req) => {
            const submission = req.submission;
            const status = submission?.status;
            const config = status ? statusConfig[status] : null;

            return (
              <Card key={req.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sti-gray-dark dark:text-white">{req.title}</h3>
                      {req.isRequired && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Required</span>
                      )}
                    </div>
                    {req.description && <p className="text-xs text-sti-gray mt-1">{req.description}</p>}
                  </div>
                  {config && (
                    <span className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.style}`}>
                      <config.Icon className="w-3.5 h-3.5" /> {config.label}
                    </span>
                  )}
                </div>

                {req.templateFile && (
                  <button
                    onClick={() => { const a=document.createElement('a'); a.href=req.templateFile; a.download=req.templateFileName || `${req.title}_template.pdf`; a.click(); }}
                    className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-sti-blue hover:text-sti-blue-dark border border-sti-blue/20 px-3 py-2 rounded-lg hover:bg-sti-blue-50 w-full justify-center"
                  >
                    <Download className="w-4 h-4" /> Download template: {req.templateFileName || 'template.pdf'} — edit your name then upload
                  </button>
                )}
                {submission && (
                  <p className="text-xs text-sti-gray mb-3 truncate">📎 {submission.fileName}</p>
                )}
                {submission?.status === 'REJECTED' && submission.remarks && (
                  <p className="text-xs text-red-600 mb-3">Reason: {submission.remarks}</p>
                )}

                <Button
                  variant={submission?.status === 'APPROVED' ? 'secondary' : 'primary'}
                  icon={Upload}
                  className="w-full"
                  loading={uploadingId === req.id}
                  onClick={() => triggerUpload(req.id)}
                >
                  {!submission ? 'Upload File' : submission.status === 'REJECTED' ? 'Re-upload' : 'Replace File'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Requirements;

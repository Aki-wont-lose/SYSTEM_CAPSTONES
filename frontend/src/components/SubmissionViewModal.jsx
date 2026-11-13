import { Download, Eye, FileText, X } from 'lucide-react';
import Button from './Button';

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const getFileExtension = (name = '') => String(name).split('.').pop()?.toLowerCase() || '';

const SubmissionViewModal = ({ submission, onClose }) => {
  if (!submission) return null;

  const fileName = submission.fileName || 'submitted_file';
  const fileData = submission.fileData || '';
  const ext = getFileExtension(fileName);
  const isPdf = ext === 'pdf' || fileData.startsWith('data:application/pdf');
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) || fileData.startsWith('data:image/');

  const studentName = submission.student
    ? `${submission.student.firstName || ''} ${submission.student.lastName || ''}`.trim()
    : submission.studentName || 'Student';

  const handleDownload = () => {
    if (!fileData) return;
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-5 h-5 text-sti-blue shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-sti-gray-dark dark:text-white truncate">
              Submission Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sti-gray hover:text-sti-gray-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Grid */}
        <div className="px-5 py-4 bg-sti-gray-light/50 dark:bg-slate-900/50 border-b border-black/5 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-sti-gray">Student Name</p>
            <p className="font-semibold text-sti-gray-dark dark:text-white mt-0.5">
              {studentName}
              {submission.student?.studentId ? ` (#${submission.student.studentId})` : ''}
            </p>
          </div>
          <div>
            <p className="text-sti-gray">Submission Type</p>
            <p className="font-semibold text-sti-gray-dark dark:text-white mt-0.5">
              {submission.requirement?.category || submission.requirement?.title || 'Requirement'}
            </p>
          </div>
          <div>
            <p className="text-sti-gray">Submission Status</p>
            <span
              className={`inline-block mt-0.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                submission.status === 'APPROVED'
                  ? 'bg-sti-blue-50 text-sti-blue'
                  : submission.status === 'REJECTED'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-yellow-50 text-sti-yellow-dark'
              }`}
            >
              {submission.status}
            </span>
          </div>
          <div>
            <p className="text-sti-gray">Uploaded File</p>
            <p className="font-semibold text-sti-gray-dark dark:text-white mt-0.5 truncate" title={fileName}>
              {fileName}
            </p>
          </div>
          <div>
            <p className="text-sti-gray">Submission Date</p>
            <p className="font-semibold text-sti-gray-dark dark:text-white mt-0.5">
              {formatDateTime(submission.submittedAt)}
            </p>
          </div>
          {submission.remarks && (
            <div>
              <p className="text-sti-gray">Remarks</p>
              <p className="font-medium text-sti-gray-dark dark:text-slate-200 mt-0.5">{submission.remarks}</p>
            </div>
          )}
        </div>

        {/* Document Preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-900 flex items-center justify-center min-h-[280px]">
          {!fileData ? (
            <div className="text-center text-sti-gray text-sm">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-60" />
              No file data available.
            </div>
          ) : isPdf ? (
            <iframe
              src={fileData}
              title={fileName}
              className="w-full h-[52vh] rounded-xl border border-black/10 dark:border-white/10 bg-white"
            />
          ) : isImage ? (
            <img
              src={fileData}
              alt={fileName}
              className="max-h-[52vh] max-w-full rounded-xl object-contain shadow-sm"
            />
          ) : (
            <div className="text-center max-w-sm space-y-3 py-8">
              <div className="w-14 h-14 rounded-2xl bg-sti-blue-50 text-sti-blue flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-sti-gray-dark dark:text-white">{fileName}</p>
              <p className="text-xs text-sti-gray">
                Inline preview is supported for PDF and image files. Download this file to view it in its native application.
              </p>
              <Button variant="primary" icon={Download} onClick={handleDownload}>
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-black/5 dark:border-white/10">
          {fileData && (
            <Button variant="primary" icon={Download} onClick={handleDownload}>
              Download
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionViewModal;

import { useEffect, useState } from 'react';
import { CalendarDays, Building2, User, Phone, Mail, Clock, MapPin } from 'lucide-react';
import Card from '../components/Card';
import { getMyProfile } from '../services/studentService';

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-black/5 dark:border-white/10 last:border-0">
    <div className="w-9 h-9 rounded-lg bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-sti-blue" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-sti-gray">{label}</p>
      <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200 break-words">{value || 'Not yet assigned'}</p>
    </div>
  </div>
);

const Schedule = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProfile()
      .then((res) => setStudent(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasAssignment = student?.company || student?.supervisorName;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">Schedule</h1>
        <p className="text-sm text-sti-gray">Your assigned company, supervisor, and working schedule.</p>
      </div>

      {!hasAssignment ? (
        <Card className="text-center py-16">
          <CalendarDays className="w-10 h-10 text-sti-gray mx-auto mb-3" />
          <p className="text-sti-gray text-sm">You haven't been assigned to a company yet.</p>
          <p className="text-sti-gray text-xs mt-1">Your OJT coordinator will assign your placement soon.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-sti-blue" />
              <h3 className="font-bold text-sti-gray-dark dark:text-white">Company</h3>
            </div>
            <div className="mt-2">
              <InfoRow icon={Building2} label="Company Name" value={student.company?.name} />
              <InfoRow icon={MapPin} label="Address" value={student.company?.address} />
              <InfoRow icon={Phone} label="Contact Number" value={student.company?.contactNumber} />
              <InfoRow icon={Mail} label="Email" value={student.company?.email} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-5 h-5 text-sti-blue" />
              <h3 className="font-bold text-sti-gray-dark dark:text-white">Supervisor & Working Hours</h3>
            </div>
            <div className="mt-2">
              <InfoRow icon={User} label="Supervisor" value={student.supervisorName} />
              <InfoRow icon={Phone} label="Supervisor Contact" value={student.supervisorContact} />
              <InfoRow icon={Mail} label="Supervisor Email" value={student.supervisorEmail} />
              <InfoRow icon={CalendarDays} label="Working Days" value={student.workingDays} />
              <InfoRow icon={Clock} label="Working Hours" value={student.workingHours} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Schedule;

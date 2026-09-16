import AdminRequirements from './AdminRequirements';
// Template is the guide for student - same as Requirement template management, now as its own tab
// This reuses AdminRequirements but defaults to 'requirements' tab
const Templates = () => {
  return <AdminRequirements defaultTab="requirements" hideSubmissions />;
};
export default Templates;

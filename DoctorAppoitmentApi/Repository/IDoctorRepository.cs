namespace DoctorAppoitmentApi.Repository
{
    public interface IDoctorRepository
    {
        Task<Doctors?> FindDoctorByNameOrSpecialtyAsync(string query);
        
        // New methods for finding doctors by specialty
        Task<IEnumerable<Doctors>> FindAllDoctorsBySpecialtyNameAsync(string specialtyName);
        Task<int> CountDoctorsBySpecialtyNameAsync(string specialtyName);
        Task<IEnumerable<Specialization>> GetAllSpecializationsAsync();
    }
}

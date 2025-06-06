namespace DoctorAppoitmentApi.Repository
{
    public class DoctorRepository : IDoctorRepository
    {
        private readonly AppDbContext _context;

        public DoctorRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Doctors?> FindDoctorByNameOrSpecialtyAsync(string query)
        {
            query = query.ToLower();

            return await _context.Doctors
                .Include(d => d.Specialization)
                .Where(d =>
                    d.FirstName.ToLower().Contains(query) ||
                    d.LastName.ToLower().Contains(query) ||
                    d.Specialization.Name.ToLower().Contains(query) ||
                    (d.Description != null && d.Description.ToLower().Contains(query))
                )
                .FirstOrDefaultAsync();
        }
        
        public async Task<IEnumerable<Doctors>> FindAllDoctorsBySpecialtyNameAsync(string specialtyName)
        {
            specialtyName = specialtyName.ToLower();
            
            // Try to match by exact specialty name or by containing the search term
            var doctors = await _context.Doctors
                .Include(d => d.Specialization)
                .Include(d => d.Clinic)
                .Where(d => 
                    d.Specialization.Name.ToLower() == specialtyName || 
                    d.Specialization.Name.ToLower().Contains(specialtyName) ||
                    specialtyName.Contains(d.Specialization.Name.ToLower())
                )
                .ToListAsync();
                
            return doctors;
        }
        
        public async Task<int> CountDoctorsBySpecialtyNameAsync(string specialtyName)
        {
            specialtyName = specialtyName.ToLower();
            
            return await _context.Doctors
                .Include(d => d.Specialization)
                .Where(d => 
                    d.Specialization.Name.ToLower() == specialtyName || 
                    d.Specialization.Name.ToLower().Contains(specialtyName) ||
                    specialtyName.Contains(d.Specialization.Name.ToLower())
                )
                .CountAsync();
        }
        
        public async Task<IEnumerable<Specialization>> GetAllSpecializationsAsync()
        {
            return await _context.Specializations.ToListAsync();
        }
    }
}

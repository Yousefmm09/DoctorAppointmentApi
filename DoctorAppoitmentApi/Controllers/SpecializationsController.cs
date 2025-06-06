using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SpecializationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public SpecializationsController(AppDbContext context)
        {
            _context = context;
        }
        [HttpGet("AllSpecializations")]
        public IActionResult AllSpecializations()
        {
            var specializations = _context.Specializations.ToList();
            if (specializations == null || specializations.Count == 0)
            {
                return NotFound("No specializations found.");
            }
            return Ok(specializations);
        }
        [HttpPost("bulk")]

        public async Task<ActionResult> AddSpecialization([FromBody] SpecializationDto specializationdto)
        {
            if (specializationdto == null)
            {
                return BadRequest("Specialization cannot be null.");
            }
            var specialization= new Specialization
            {
                Name = specializationdto.Name,
                Description = specializationdto.Description,
            };
            await _context.Specializations.AddAsync(specialization);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(AllSpecializations), new { id = specialization.Id }, specialization);
        }

    }
}

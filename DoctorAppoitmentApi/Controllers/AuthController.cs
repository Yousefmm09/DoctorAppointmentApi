//using Google.Apis.Auth.OAuth2;
//using Microsoft.AspNetCore.Authentication;
//using Microsoft.AspNetCore.Authentication.Cookies;
//using Microsoft.AspNetCore.Authentication.Google;
//using Microsoft.AspNetCore.Http;
//using Microsoft.AspNetCore.Mvc;
//using System.Security.Claims;
//using DoctorAppoitmentApi.Service;
//namespace DoctorAppoitmentApi.Controllers
//{
//    [Route("api/[controller]")]
//    [ApiController]
//    public class AuthController : ControllerBase
//    {
//        private readonly AppDbContext _context;
//        private readonly GoogleAuthService _googleService;

//        private readonly UserManager<ApplicationUser> _userManager;

//        public AuthController(AppDbContext appDb, GoogleAuthService googleAuth, UserManager<ApplicationUser> userManager)
//        {
//            _context = appDb;
//            _googleService = googleAuth;
//            _userManager = userManager;
//        }

//        [HttpPost("register_Patient")]
//        [Consumes("multipart/form-data")]
//        public async Task<IActionResult> RegisterPatient([From] GoogleRegisterRequestDto request)
//        {
//            // 1. تحقق من الـ Google Token
//            var payload = await _googleService.VerifyGoogleToken(request.IdToken);
//            if (payload == null)
//            {
//                return BadRequest("Invalid Google Token");
//            }

//            // 2. تحقق إذا كان المستخدم موجود بالفعل
//            var existingUser = await _userManager.FindByEmailAsync(payload.Email);
//            if (existingUser != null)
//            {
//                return BadRequest("User already exists");
//            }

//            // 3. إنشاء مستخدم جديد
//            var newUser = new ApplicationUser
//            {
//                UserName = payload.Email,
//                Email = payload.Email,
//                EmailConfirmed = true,
                
//            };

//            var result = await _userManager.CreateAsync(newUser);
//            if (!result.Succeeded)
//            {
//                return BadRequest(result.Errors);
//            }

//            // 4. ربط الحساب بـ Google Login
//            var loginInfo = new UserLoginInfo("Google", payload.Subject, "Google");
//            await _userManager.AddLoginAsync(newUser, loginInfo);

//            // 5. إنشاء المريض
          


//            var patient = new Patient
//            {
//                ApplicationUserId = newUser.Id,
//                Address = request.Address,
//                PhoneNumber = request.PhoneNumber,
//                DateOfBirth = request.DateOfBirth,
//                Gender = request.Gender,
//                Email = payload.Email,
//                ProfilePicture = payload.Picture,
//                City = request.City,
//                ZipCode = request.ZipCode,
                
                
//            };
//            if (request.ProfilePictureFile != null)
//            {
//                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png",};
//                var fileExtension = Path.GetExtension(request.ProfilePictureFile.FileName).ToLower();

//                if (!allowedExtensions.Contains(fileExtension))
//                    return BadRequest("Only image files (jpg, jpeg, png) are allowed.");

//                if (request.ProfilePictureFile.Length > 2 * 1024 * 1024)
//                    return BadRequest("Image size must be less than 2MB.");

//                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "profile_images");
//                if (!Directory.Exists(uploadsFolder))
//                    Directory.CreateDirectory(uploadsFolder);

//                var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(request.ProfilePictureFile.FileName)}";
//                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

//                try
//                {
//                    using var stream = new FileStream(filePath, FileMode.Create);
//                    await request.ProfilePictureFile.CopyToAsync(stream);
//                    patient.ProfilePicture = $"/profile_images/{uniqueFileName}";
//                }
//                catch (Exception ex)
//                {
//                    return StatusCode(500, $"Error uploading profile picture: {ex.Message}");
//                }
//            }

//            _context.Patients.Add(patient);
//            await _context.SaveChangesAsync();

//            // 6. إرجاع النتيجة
//            return Ok(new
//            {
//                message = "Patient registered via Google successfully",
//                email = newUser.Email
//            });
//        }
//    }
//}
//        //[HttpGet]
//        //[Route("google-login")]
//        //public IActionResult GoogleLogin()
//        //{
//        //    var redirectUrl = Url.Action("GoogleResponse", "Auth");
//        //    var properties = new AuthenticationProperties { RedirectUri = redirectUrl };
//        //    return Challenge(properties, GoogleDefaults.AuthenticationScheme);
//        //}
//        //[HttpGet]
//        //[Route("google-response")]
//        //public async Task<IActionResult> GoogleResponse()
//        //{
//        //    var result = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
//        //    if (result.Succeeded)
//        //    {
//        //        // Handle successful authentication
//        //        var claims = result.Principal.Claims;
//        //        var email = claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
//        //        var name = claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;
//        //        // You can create a JWT token here and return it to the client
//        //        return Ok(new { email, name });
//        //    }
//        //    return Unauthorized();
//        //}


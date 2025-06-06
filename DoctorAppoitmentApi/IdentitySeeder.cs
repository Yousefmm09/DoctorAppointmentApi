using Microsoft.AspNetCore.Identity;
namespace DoctorAppoitmentApi
{
    public class IdentitySeeder
    {
        public static async Task SeedRolesAndAdminAsync(RoleManager<IdentityRole> roleManager, UserManager<ApplicationUser> userManager)
        {
            //  Seed Roles
            string[] roles = { "Admin", "Patient","Doctor"};

            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }

            //  Seed Default Admin User
            var defaultAdminEmail = "admin@system.com";
            var defaultAdminPassword = "Admin@12345";

            if (await userManager.FindByEmailAsync(defaultAdminEmail) == null)
            {
                var adminUser = new ApplicationUser
                {
                    UserName = defaultAdminEmail,
                    Email = defaultAdminEmail,
                    EmailConfirmed = true,
                    FirstName = "System",
                    LastName = "Admin",
                    PhoneNumber = "1234567890", // Default phone number
                    Address = "123 Admin St, Admin City", // Default address
                    ProfilePicture = "default-profile-pic.jpg",// Default profile picture
                    Gender="Male"

                };

                var result = await userManager.CreateAsync(adminUser, defaultAdminPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, "Admin");
                }
            }
        }
    }
}

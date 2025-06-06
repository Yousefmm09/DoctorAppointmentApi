using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DoctorAppoitmentApi.Models;
using DoctorAppoitmentApi;
using DoctorAppointmentApi;
using Microsoft.AspNetCore.Authentication.Cookies;
using DoctorAppoitmentApi.Service;
using DoctorAppoitmentApi.Repository;
using Microsoft.Extensions.Caching.Memory;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Add DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddMemoryCache();

// Add Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequireUppercase = true;
    options.Password.RequiredLength = 6;
    options.Password.RequiredUniqueChars = 1;

    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// Add SignalR
builder.Services.AddSignalR();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder =>
        {
            builder
            .WithOrigins("http://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
        });
});

// Add Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JWT:ValidIssuer"],
        ValidAudience = builder.Configuration["JWT:ValidAudience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JWT:Secret"]))
    };
});

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Doctor Appointment API",
        Version = "v1",
        Description = "API for Doctor Appointment System"
    });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token below."
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Add services
builder.Services.AddScoped<IOpenAIService>(provider => new AdvancedOpenAIService(
    provider.GetRequiredService<IHttpClientFactory>().CreateClient(),
    provider.GetRequiredService<IConfiguration>(),
    provider.GetRequiredService<IMemoryCache>(),
    provider.GetService<ILogger<AdvancedOpenAIService>>()
));

// Add RAG service registration
builder.Services.AddScoped<IRAGService, RAGService>();


builder.Services.AddScoped<IDoctorRepository, DoctorRepository>();
builder.Services.AddScoped<ICombinedChatService>(provider => {
    var logger = provider.GetService<ILogger<CombinedChatService>>();
    var httpClient = provider.GetRequiredService<IHttpClientFactory>().CreateClient();
    var config = provider.GetRequiredService<IConfiguration>();
    var cache = provider.GetRequiredService<IMemoryCache>();
    var context = provider.GetRequiredService<AppDbContext>();
    var openAIService = provider.GetRequiredService<IOpenAIService>();
    var doctorRepository = provider.GetRequiredService<IDoctorRepository>();

    return new CombinedChatService(
        openAIService,
        doctorRepository,
        cache,
        context,
        config,
        httpClient,
        logger
    );
});
builder.Services.AddScoped<ChatService>(provider => new ChatService(
    provider.GetRequiredService<IOpenAIService>(),
    provider.GetRequiredService<IDoctorRepository>(),
    provider.GetRequiredService<IMemoryCache>(),
    provider.GetRequiredService<AppDbContext>(),
    provider.GetService<ILogger<ChatService>>()
));
builder.Services.AddHttpClient();

// Add LocalKnowledgeBase service with enhanced configuration
builder.Services.AddScoped<ILocalKnowledgeBase>(provider => {
    var doctorRepository = provider.GetRequiredService<IDoctorRepository>();
    var context = provider.GetRequiredService<AppDbContext>();
    var logger = provider.GetService<ILogger<LocalKnowledgeBase>>();
    return (ILocalKnowledgeBase)new LocalKnowledgeBase(doctorRepository, context, logger);
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Doctor Appointment API V1");
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    });
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

// Seed data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

    await IdentitySeeder.SeedRolesAndAdminAsync(roleManager, userManager);
}

// Middleware pipeline - ??????? ???!
app.UseHttpsRedirection();
app.UseStaticFiles();

// CORS ??? Authentication
app.UseCors("AllowReactApp");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// SignalR Hub
app.MapHub<ChatHub>("/chathub");

// Controllers
app.MapControllers();

app.Run();
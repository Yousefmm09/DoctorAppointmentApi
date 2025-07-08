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
using System;

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
            .SetIsOriginAllowed(origin => {
                return origin.EndsWith(".paymob.com") ||
                       origin.Contains("localhost") ||
                       origin.Contains("127.0.0.1") ||
                       origin == "https://accept.paymobsolutions.com";
            })
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

// Add Email Service
builder.Services.AddScoped<IEmailService, EmailService>();

// Add SMS Service
builder.Services.AddHttpClient<ISmsService, SmsService>();
builder.Services.AddScoped<ISmsService>(provider => 
    new SmsService(
        provider.GetRequiredService<IConfiguration>(),
        provider.GetRequiredService<ILogger<SmsService>>(),
        provider.GetRequiredService<HttpClient>()
    )
);

// Add Background Service for Appointment Reminders
builder.Services.AddHostedService<AppointmentReminderService>();

// Add Background Service for Account Cleanup
builder.Services.AddHostedService<AccountCleanupService>();

// Add PaymobService
builder.Services.AddHttpClient<PaymobService>();
builder.Services.AddScoped<PaymobService>(provider => 
    new PaymobService(
        provider.GetRequiredService<HttpClient>(),
        provider.GetRequiredService<IConfiguration>(),
        provider.GetRequiredService<ILogger<PaymobService>>()
    )
);

// Add RAG service registration
builder.Services.AddScoped<IRAGService, RAGService>();

builder.Services.AddScoped<IDoctorRepository, DoctorRepository>();

// Add LocalLLM service
builder.Services.AddScoped<ILocalLLMService>(provider => {
    var logger = provider.GetService<ILogger<LocalLLMService>>();
    var httpClient = provider.GetRequiredService<IHttpClientFactory>().CreateClient();
    var config = provider.GetRequiredService<IConfiguration>();
    var cache = provider.GetRequiredService<IMemoryCache>();
    
    return new LocalLLMService(httpClient, config, cache, logger);
});

// Replace CombinedChatService with HybridChatService when UseLocalLLM is true
if (bool.Parse(builder.Configuration["LocalLLM:UseLocalLLM"] ?? "false"))
{
    builder.Services.AddScoped<ICombinedChatService>(provider => {
        var logger = provider.GetService<ILogger<HybridChatService>>();
        var localKnowledgeBase = provider.GetRequiredService<ILocalKnowledgeBase>();
        var localLLMService = provider.GetRequiredService<ILocalLLMService>();
        var openAIService = provider.GetRequiredService<IOpenAIService>();
        var cache = provider.GetRequiredService<IMemoryCache>();
        var config = provider.GetRequiredService<IConfiguration>();
        
        return new HybridChatService(
            localKnowledgeBase,
            localLLMService,
            openAIService,
            cache,
            config,
            logger
        );
    });
}
else
{
    // Use original CombinedChatService implementation
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
}

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

// Register MedLLama Service
builder.Services.AddHttpClient<IMedLLamaService, MedLLamaService>(client => {
    var medLLamaApiUrl = builder.Configuration["MedLLama:ApiUrl"] ?? "http://localhost:5001";
    client.BaseAddress = new Uri(medLLamaApiUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

// Add Notification Service
builder.Services.AddScoped<INotificationService, NotificationService>();

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
app.MapHub<NotificationHub>("/notificationhub");

// Controllers
app.MapControllers();

app.Run();
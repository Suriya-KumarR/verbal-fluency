using System.Text.Json;
using System.Text.Json.Serialization;
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    ApplicationName = typeof(Program).Assembly.FullName,
    ContentRootPath = Directory.GetCurrentDirectory(),
    WebRootPath = "wwwroot",
    Args = args
});

// Explicitly set URLs to override any defaults
builder.WebHost.UseUrls("http://localhost:5149", "https://localhost:7272");

// Add services to the container.
// Add this to your services configuration
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.WriteIndented = true;
    });
builder.Services.AddEndpointsApiExplorer(); // Required for Swagger
builder.Services.AddSwaggerGen(); // Add Swagger

builder.Services.AddCors(options =>
{
    options.AddPolicy("VueApp", policy =>
    {
        policy.WithOrigins(
                "http://localhost:8080",
                "http://192.168.86.77:8080",
                "http://127.0.0.1:8080",
                "https://verbal-fluency-wpxb.vercel.app/"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithExposedHeaders("Content-Disposition"); // Needed for file downloads
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger(); // Enable Swagger middleware
    app.UseSwaggerUI(); // Enable Swagger UI
}

//app.UseHttpsRedirection();
app.UseAuthorization();
app.UseCors("VueApp");
app.MapControllers();

// When processing the JSON on the server side, ensure mark property is preserved
app.MapPost("/api/file/update-json/{filename}", async (HttpContext context, string filename) =>
{
    try
    {
        // Read the request body
        using var reader = new StreamReader(context.Request.Body);
        var json = await reader.ReadToEndAsync();
        
        // Parse the JSON
        var transcription = JsonSerializer.Deserialize<TranscriptionData>(json);
        
        // Ensure each word has a mark property
        foreach (var word in transcription.Words)
        {
            // If mark property doesn't exist in the JSON, add it with default value
            if (word.GetType().GetProperty("Mark") == null)
            {
                word.Mark = false;
            }
        }
        
        // Save the updated JSON
        var jsonFilePath = Path.Combine(jsonDirectory, $"{filename}.json");
        await File.WriteAllTextAsync(jsonFilePath, JsonSerializer.Serialize(transcription));
        
        return Results.Ok();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.Run();

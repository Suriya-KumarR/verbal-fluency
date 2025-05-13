using System.Text.Json;
using System.Text.Json.Serialization;
using FileUploadApi.Models; // Add this to reference TranscriptionData
using System.Net;
using System.Net.Sockets;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    ApplicationName = typeof(Program).Assembly.FullName,
    ContentRootPath = Directory.GetCurrentDirectory(),
    WebRootPath = "wwwroot",
    Args = args
});

// Define jsonDirectory
string jsonDirectory = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
if (!Directory.Exists(jsonDirectory))
{
    Directory.CreateDirectory(jsonDirectory);
}

// Add this function somewhere in the Program.cs file, before building the app
int FindAvailablePort(int startPort, int endPort = 5200)
{
    var tcpListener = new TcpListener(IPAddress.Loopback, 0);
    
    try
    {
        // Try the preferred port first
        var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
        socket.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
        try
        {
            socket.Bind(new IPEndPoint(IPAddress.Loopback, startPort));
            socket.Close();
            return startPort;
        }
        catch (SocketException)
        {
            socket.Close();
            // Preferred port is unavailable, find another one
            Console.WriteLine($"Port {startPort} is unavailable, searching for an open port...");
        }
        
        // If we get here, the preferred port is taken, so find any available port
        tcpListener.Start();
        var port = ((IPEndPoint)tcpListener.LocalEndpoint).Port;
        tcpListener.Stop();
        Console.WriteLine($"Using port {port} instead");
        return port;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error finding available port: {ex.Message}");
        return startPort; // Return the original port and hope for the best
    }
    finally
    {
        tcpListener.Stop();
    }
}

// Modify the UseUrls call
int httpPort = FindAvailablePort(5170);
int httpsPort = FindAvailablePort(7273);
builder.WebHost.UseUrls($"http://localhost:{httpPort}", $"https://localhost:{httpsPort}");
Console.WriteLine($"Server configured to use HTTP port {httpPort} and HTTPS port {httpsPort}");

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
                "http://localhost:8081",
                "http://192.168.86.77:8080",
                "http://192.168.86.77:8081",
                "http://127.0.0.1:8080",
                "http://127.0.0.1:8081",
                "http://localhost:5170",
                "https://localhost:7273",
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
            // Initialize mark to false if it's the default value
            if (!word.Mark) // Changed from word.Mark == null
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

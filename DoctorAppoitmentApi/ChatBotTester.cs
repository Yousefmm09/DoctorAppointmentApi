using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Text.Json;

public class ChatBotTester
{
    static readonly HttpClient client = new HttpClient();
    
    public static async Task Main(string[] args)
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        Console.WriteLine("اختبار الشات بوت الطبي (للخروج اكتب 'خروج')");
        Console.WriteLine("--------------------------------------");
        
        client.BaseAddress = new Uri("http://localhost:5000/");
        
        string userId = "test-user-" + DateTime.Now.Ticks;
        
        while (true)
        {
            Console.Write("\nاكتب سؤالك: ");
            string userInput = Console.ReadLine();
            
            if (userInput.ToLower() == "خروج" || userInput.ToLower() == "exit")
                break;
            
            try
            {
                var request = new
                {
                    message = userInput,
                    userId = userId
                };
                
                var response = await client.PostAsJsonAsync("api/AdvancedChatBot", request);
                response.EnsureSuccessStatusCode();
                
                var content = await response.Content.ReadAsStringAsync();
                var responseObject = JsonSerializer.Deserialize<ChatResponse>(content, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                Console.WriteLine("\nرد النظام:");
                Console.WriteLine(responseObject.Response);
                
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\nحدث خطأ: {ex.Message}");
            }
        }
    }
    
    private class ChatResponse
    {
        public string Response { get; set; }
    }
} 
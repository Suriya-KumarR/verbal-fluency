using System.Text.Json.Serialization;

namespace FileUploadApi.Models
{
    public class TranscriptionData
    {
        public string Filename { get; set; } = string.Empty;
        public double Duration { get; set; }
        public List<WordData> Words { get; set; } = new List<WordData>();
    }

    public class WordData
    {
        public string Word { get; set; } = string.Empty;
        public int Start_time { get; set; }
        public int End_time { get; set; }
        public bool Edited { get; set; }
        public bool Qc { get; set; }
        public string Qc_word { get; set; } = string.Empty;
        public bool Mark { get; set; } = false;
    }
} 
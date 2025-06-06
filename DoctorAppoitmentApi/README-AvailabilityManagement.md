# Doctor Availability Management Feature

This feature allows doctors to manage their availability for patient appointments. It enables doctors to:

1. Set available time slots on specific dates
2. View their availability for a date range
3. Update existing availability slots
4. Remove availability slots that haven't been booked

## API Endpoints

### Get Doctor Availability

**Endpoint:** `GET /api/DoctorAvailability/doctor/{doctorId}`

**Query Parameters:**
- `startDate`: Start date of the range (YYYY-MM-DD)
- `endDate`: End date of the range (YYYY-MM-DD)

**Example Request:**
```
GET /api/DoctorAvailability/doctor/3?startDate=2023-05-25&endDate=2023-05-31
```

**Example Response:**
```json
{
  "startDate": "2023-05-25T00:00:00",
  "endDate": "2023-05-31T00:00:00",
  "availableSlots": [
    {
      "id": 1,
      "doctorId": 3,
      "doctorName": "John Smith",
      "date": "2023-05-25T00:00:00",
      "startTime": "09:00",
      "endTime": "10:00",
      "isBooked": false
    },
    {
      "id": 2,
      "doctorId": 3,
      "doctorName": "John Smith",
      "date": "2023-05-25T00:00:00",
      "startTime": "10:00",
      "endTime": "11:00",
      "isBooked": true
    }
  ]
}
```

### Add Doctor Availability

**Endpoint:** `POST /api/DoctorAvailability/add`

**Request Body:**
```json
{
  "doctorId": 3,
  "date": "2023-05-25",
  "startTime": "09:00:00",
  "endTime": "10:00:00"
}
```

**Example Response:**
```json
{
  "id": 1,
  "doctorId": 3,
  "doctorName": "John Smith",
  "date": "2023-05-25T00:00:00",
  "startTime": "09:00",
  "endTime": "10:00",
  "isBooked": false
}
```

### Update Doctor Availability

**Endpoint:** `PUT /api/DoctorAvailability/update/{id}`

**Request Body:**
```json
{
  "doctorId": 3,
  "date": "2023-05-25",
  "startTime": "10:00:00",
  "endTime": "11:00:00"
}
```

**Example Response:**
```json
{
  "id": 1,
  "doctorId": 3,
  "doctorName": "John Smith",
  "date": "2023-05-25T00:00:00",
  "startTime": "10:00",
  "endTime": "11:00",
  "isBooked": false
}
```

### Delete Doctor Availability

**Endpoint:** `DELETE /api/DoctorAvailability/delete/{id}`

**Example Response:**
```json
{
  "message": "Availability deleted successfully."
}
```

## Models

### DoctorAvailability
```csharp
public class DoctorAvailability
{
    public int Id { get; set; }
    
    [Required]
    public int DoctorID { get; set; }
    
    [Required]
    [DataType(DataType.Date)]
    public DateTime Date { get; set; }
    
    [Required]
    [DataType(DataType.Time)]
    public TimeSpan StartTime { get; set; }
    
    [Required]
    [DataType(DataType.Time)]
    public TimeSpan EndTime { get; set; }
    
    public bool IsBooked { get; set; } = false;
    
    public bool IsActive { get; set; } = true;
    
    [ForeignKey("DoctorID")]
    public virtual Doctors Doctor { get; set; }
}
```

## Frontend Integration

To integrate with the frontend:

1. Call the `GET /api/DoctorAvailability/doctor/{doctorId}` endpoint to load availability for the weekly calendar view
2. Use the `POST /api/DoctorAvailability/add` endpoint when a doctor adds a new time slot
3. Use the `PUT /api/DoctorAvailability/update/{id}` endpoint when a doctor updates an existing time slot
4. Use the `DELETE /api/DoctorAvailability/delete/{id}` endpoint when a doctor deletes a time slot

## Migration Note

After adding these components, you'll need to run:

```
dotnet ef migrations add AddDoctorAvailability
dotnet ef database update
```

## Validation Rules

- Time slots cannot be created for past dates
- Time slots cannot overlap with existing time slots
- Start time must be before end time
- Booked time slots cannot be updated or deleted 
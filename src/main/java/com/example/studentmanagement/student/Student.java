
package com.example.studentmanagement.student;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "students")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Frontend student fields
    @Column(name = "student_code", unique = true)
    private String studentId;

    private String firstName;
    private String lastName;
    private LocalDate dob;
    private Integer age;
    private String phone;

    @Column(name = "student_group")
    @JsonProperty("group")
    private String group;

    private String department;
    private String academicYear;

    // Existing backend fields
    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String course;

    @Column(nullable = false)
    private int year;

    public Student() {}

    // Getters
    public Long getId() { return id; }
    public String getStudentId() { return studentId; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public LocalDate getDob() { return dob; }
    public Integer getAge() { return age; }
    public String getPhone() { return phone; }

    @JsonProperty("group")
    public String getGroup() { return group; }

    public String getDepartment() { return department; }
    public String getAcademicYear() { return academicYear; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getCourse() { return course; }
    public int getYear() { return year; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public void setDob(LocalDate dob) { this.dob = dob; }
    public void setAge(Integer age) { this.age = age; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setGroup(String group) { this.group = group; }
    public void setDepartment(String department) { this.department = department; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
    public void setName(String name) { this.name = name; }
    public void setEmail(String email) { this.email = email; }
    public void setCourse(String course) { this.course = course; }
    public void setYear(int year) { this.year = year; }
}
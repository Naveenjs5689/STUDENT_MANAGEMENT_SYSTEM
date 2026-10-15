
package com.example.studentmanagement.student;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentRepository repository;

    public StudentController(StudentRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Student> getAllStudents() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public Student getStudent(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Student not found"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Student addStudent(@Valid @RequestBody Student student) {
        student.setId(null);
        synchronizeLegacyFields(student);
        return repository.save(student);
    }

    @PutMapping("/{id}")
    public Student updateStudent(
            @PathVariable Long id,
            @Valid @RequestBody Student updated) {

        Student existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Student not found"));

        existing.setStudentId(updated.getStudentId());
        existing.setFirstName(updated.getFirstName());
        existing.setLastName(updated.getLastName());
        existing.setDob(updated.getDob());
        existing.setAge(updated.getAge());
        existing.setPhone(updated.getPhone());
        existing.setGroup(updated.getGroup());
        existing.setDepartment(updated.getDepartment());

        synchronizeLegacyFields(existing);
        return repository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStudent(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Student not found");
        }
        repository.deleteById(id);
    }

    private void synchronizeLegacyFields(Student student) {
        String first = student.getFirstName() == null
                ? "" : student.getFirstName().trim();
        String last = student.getLastName() == null
                ? "" : student.getLastName().trim();

        String fullName = (first + " " + last).trim();

        if (!fullName.isEmpty()) {
            student.setName(fullName);
        } else if (student.getName() == null
                || student.getName().isBlank()) {
            student.setName("Student");
        }

        if (student.getEmail() == null
                || student.getEmail().isBlank()) {
            String idPart = student.getStudentId() == null
                    ? UUID.randomUUID().toString()
                    : student.getStudentId()
                        .toLowerCase()
                        .replaceAll("[^a-z0-9]", "");

            if (idPart.isBlank()) {
                idPart = UUID.randomUUID().toString();
            }

            student.setEmail(idPart + "@student.local");
        }

        if (student.getCourse() == null
                || student.getCourse().isBlank()) {
            student.setCourse(
                    student.getDepartment() == null
                            || student.getDepartment().isBlank()
                            ? "General"
                            : student.getDepartment());
        }

        if (student.getYear() < 1) {
            student.setYear(1);
        }
    }
}
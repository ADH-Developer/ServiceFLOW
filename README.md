# serviceFLOW - (FLOW = Flexible  Logistics  Operations  Workflows)

##Why:
Modern service shops face a triad of challenges: maintaining customer trust, optimizing workflows, and fostering transparency across teams. serviceFlow was created to address these pain points by transforming how service shops communicate, manage tasks, and deliver results. By prioritizing openness and leveraging technology, serviceFlow empowers mechanics, advisors, and managers to build trust and drive efficiency—every step of the way. 

##What:
serviceFlow is a role-based web application designed to streamline service shop operations through transparency and collaboration. It centralizes work orders, inspections, approvals, and parts management into a unified platform. The app fosters trust with customers by incorporating visual documentation (photos/videos), transparent approval workflows, and real-time status updates. Tailored dashboards ensure mechanics, advisors, and managers operate with clarity and focus, while integrations with tools like QuickBooks enhance financial and inventory efficiency.

##How:
Built with a scalable and modern tech stack, serviceFlow combines the power of Django for backend robustness and Next.js for dynamic, responsive user interfaces. The application emphasizes rapid development and modular design to accommodate future scalability. 

##Features include:

-Transparent Workflows: Approval-first process with overrides for safety-critical tasks.
-Visual Inspections: Mechanics can document findings with photos/videos to increase customer trust.
-Role-Based Dashboards: Trello-style views tailored for mechanics, service advisors, and managers.
-Parts Management: Basic inventory tracking linked to work orders.
-Scalable Architecture: Dockerized development, PostgreSQL, and Next.js ensure performance and extensibility.

##Key Features:
Role-based dashboards for mechanics, advisors, and managers.
Transparent customer approvals with visual evidence.
Real-time work order tracking and updates.
Modular design for scalability and future integrations (e.g., QuickBooks).

##Tech Stack:
-Frontend: Next.js, Chakra UI.
-Backend: Django REST Framework.
-Database: PostgreSQL.
-Deployment: Dockerized containers for consistency and scalability.

## Join us in redefining service shop management with a platform that prioritizes trust, communication, and innovation. 

We’re excited to see how serviceFlow can streamline your shop’s operations and build trust with your customers. Contributions, feedback, and collaboration are welcome!

AH

# We're using Django-Next.js-Boilerplate!

This is a basic boilerplate starter for a fullstack web project with Django as the server, PostgreSQL as the database and Next.js as the frontend.
<!-- 
<a href="https://www.codefactor.io/repository/github/akshat2602/django-nextjs-boilerplate/overview/master" target="_blank"> <img src="https://img.shields.io/codefactor/grade/github/akshat2602/django-nextjs-boilerplate?style=flat-square" /> </a>
<a href="https://github.com/akshat2602/django-nextjs-template/blob/master/LICENSE" target="_blank"> <img src="https://img.shields.io/github/license/akshat2602/django-nextjs-template?style=flat-square" /> </a>
<a href="https://github.com/akshat2602/django-nextjs-template" target="_blank"> <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/akshat2602/django-nextjs-template?style=flat-square"> </a> -->



## About the template 
-   PostgreSQL used as the primary database.
-   Superuser is already initialized with the credentials: Username- `admin`, Email- `admin@admin.com`, Password- `admin`
-   Integration with Django Rest Framework
-   Integrated Djoser for user register/login/logout workflows.
-   Used JWT for Authentication.
-   API Documentation is configured using swagger.
-   Containerized using Docker and managed using docker-compose.
-   A typescripted Next.js client has been preinstalled and integrated with docker-compose.
-   Added Chakra UI and Chakra icons in the frontend as a design and component library alongwith axios for making api calls.

## Getting Started
To get a local copy of this template up and running on your machine, follow these simple steps.
### Prerequisites
- Docker
`curl -fsSL https://get.docker.com -o get-docker.sh`
`sudo sh get-docker.sh`

### Installation
- Clone the repo `git clone https://github.com/ADH-Developer/serviceFLOW.git`
- Change the current directory to the template `cd serviceFLOW`
- Build the docker containers`docker-compose -f docker-compose.dev.yml build` for the dev containers and `docker-compose -f docker-compose.prod.yml build` for the prod containers
- Run the docker containers`docker-compose -f docker-compose.dev.yml up` for the dev containers and `docker-compose -f docker-compose.prod.yml up` for the prod containers

## API Documentation
API documentation is done using swagger. Visit `/swagger` for API documentation.

## Technologies used
<a href="https://www.djangoproject.com/" target="_blank"><img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white"/> </a>
<a href="https://www.django-rest-framework.org/" target="_blank"> <img src="https://img.shields.io/badge/DJANGO-REST-ff1709?style=for-the-badge&logo=django&logoColor=white&color=ff1709&labelColor=gray" /> </a>
<a href="https://www.docker.com/" target="_blank"><img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white"/> </a>
<a href="https://www.postgresql.org" target="_blank"> <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white"/></a>
<a href="https://www.nextjs.org/" target="_blank"> <img src="https://img.shields.io/badge/Next.JS-000000?style=for-the-badge&logo=next.js&logoColor=white"/> </a>
<a href="https://www.typescriptlang.org/" target="_blank"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white"/></a>


## Contributing
Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License
Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/ADH-Developer/serviceFLOW](https://github.com/ADH-Developer/serviceFLOW)


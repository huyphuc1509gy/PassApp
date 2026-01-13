import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container, Row, Col, Card, CardBody, Form, FormGroup, Label, Input, Button, Alert, 
    InputGroup, InputGroupText
} from 'reactstrap';
import { 
    Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2 
} from 'lucide-react';
import api from '../api';
import { deriveKeys } from '../utils/crypto.js';
import { AuthContext } from '../contexts/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const { loginSuccess } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); 

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Get authkey , enckey 
            // send authkey and email to backend
            // Use enckey for encode vault , save on useContext 
            const { authKey, encKey } = deriveKeys(email, password);

            const res = await api.post('/auth/login', {
                email,
                authKey
            });

            const { token, userId } = res.data;
            loginSuccess({ email, userId }, token, encKey);
            navigate('/');

        } catch (err) {
            console.error("Login failed:", err);
            setError(err.response?.data?.message || "Incorrect email or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center min-vh-100 bg-light">
            <Container>
                <Row className="justify-content-center">
                    <Col xs={12} sm={10} md={8} lg={6} xl={5}>
                        <Card className="shadow-lg border-0 rounded-4"> 
                            <CardBody className="p-5">
                                {/* Header Section */}
                                <div className="text-center mb-5">
                                    <div className="bg-primary bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
                                        <ShieldCheck className="text-primary" size={48} strokeWidth={1.5} />
                                    </div>
                                    <h2 className="fw-bold text-dark">My Vault</h2>
                                    <p className="text-muted">Login to unlock your vault</p>
                                </div>

                                {error && (
                                    <Alert color="danger" className="d-flex align-items-center gap-2 border-0 bg-danger bg-opacity-10 text-danger rounded-3">
                                        <span>{error}</span>
                                    </Alert>
                                )}

                                <Form onSubmit={handleLogin}>
                                    <FormGroup className="mb-4">
                                        <Label for="email" className="fw-medium text-secondary small text-uppercase">Email</Label>
                                        <InputGroup className="input-group-lg">
                                            <InputGroupText className="bg-white border-end-0 text-muted">
                                                <Mail size={20} />
                                            </InputGroupText>
                                            <Input
                                                type="email"
                                                id="email"
                                                required
                                                placeholder="user@example.com"
                                                className="border-start-0 ps-0"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                style={{ boxShadow: 'none' }} 
                                            />
                                        </InputGroup>
                                    </FormGroup>

                                    <FormGroup className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <Label for="password" className="fw-medium text-secondary small text-uppercase">Master Password</Label>
                                            <Link to="/recovery" className="text-decoration-none small text-primary fw-bold">
                                                Forgot Password?
                                            </Link>
                                        </div>
                                        <InputGroup className="input-group-lg">
                                            <InputGroupText className="bg-white border-end-0 text-muted">
                                                <Lock size={20} />
                                            </InputGroupText>
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                id="password"
                                                required
                                                placeholder="••••••••"
                                                className="border-start-0 border-end-0 ps-0"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            <InputGroupText 
                                                className="bg-white border-start-0" 
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <EyeOff size={20} className="text-muted"/> : <Eye size={20} className="text-muted"/>}
                                            </InputGroupText>
                                        </InputGroup>
                                    </FormGroup>

                                    <Button color="primary" block size="lg" disabled={loading} className="rounded-3 mt-2 py-3 fw-bold d-flex align-items-center justify-content-center gap-2">
                                        {loading ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Decrypting...
                                            </>
                                        ) : (
                                            <>
                                                Unlock <ArrowRight size={20} />
                                            </>
                                        )}
                                    </Button>
                                </Form>

                                <div className="d-flex justify-content-center font-small mt-4">
                                    <span className="text-muted me-2">New to My Vault?</span>
                                    <Link to="/register" className="text-decoration-none fw-bold text-primary">
                                        Create New Account
                                    </Link>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;